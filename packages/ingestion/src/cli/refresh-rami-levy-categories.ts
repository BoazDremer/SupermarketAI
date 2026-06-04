/**
 * CLI: `pnpm refresh:rami-levy-categories`
 *
 * Rebuilds two RL taxonomy artifacts with the most complete view we can derive
 * locally:
 *   1) data/processed/categories/rami-levy.json
 *   2) data/processed/categories/rami-levy-category-list.txt
 *
 * Data sources merged (in priority order):
 *   - Existing tree JSON (stable dept/group labels and URLs)
 *   - RL catalog payloads on RetailerProduct.rawData (subGroup ids + names/slugs)
 *   - RetailerCategoryAlias rows (extra names discovered by mapper)
 *   - Optional sample catalog JSON fallback
 */

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getPrismaClient } from '@supermarket-price-compare/db';
import { createProgress } from '../progress.js';
import type { ChainCategoryNode, ChainCategoryTree } from '../scrapers/types.js';

type Args = {
  inputTreePath: string;
  inputSamplePath: string;
  outputTreePath: string;
  outputListPath: string;
  includeDb: boolean;
  includeAliases: boolean;
  fetchLiveCatalog: boolean;
  liveDelayMs: number;
};

type MutableNode = {
  id: string;
  nameHe: string;
  slug?: string;
  url?: string;
  depth: number;
  children: MutableNode[];
  productCount?: number;
};

type MutableGroup = MutableNode & { parentDepartmentId: string };
type MutableSubGroup = MutableNode & {
  parentDepartmentId: string;
  parentGroupId: string;
};

type RawCategoryTree = {
  retailerSlug?: string;
  retailerNameHe?: string;
  roots?: unknown[];
};

type RawCatalogEntry = {
  department?: { id?: number | string; name?: string; slug?: string };
  group?: { id?: number | string; name?: string; slug?: string };
  subGroup?: { id?: number | string; name?: string; slug?: string };
};

type RawCatalogSample = { data?: RawCatalogEntry[] };

const MARKER_FILE = 'pnpm-workspace.yaml';
const RL_SLUG = 'rami-levy';

function parseArgs(argv: readonly string[], repoRoot: string): Args {
  const args: Args = {
    inputTreePath: path.join(repoRoot, 'data/processed/categories/rami-levy.json'),
    inputSamplePath: path.join(repoRoot, 'data/processed/samples/rami-levy-catalog-first-100.json'),
    outputTreePath: path.join(repoRoot, 'data/processed/categories/rami-levy.json'),
    outputListPath: path.join(repoRoot, 'data/processed/categories/rami-levy-category-list.txt'),
    includeDb: true,
    includeAliases: true,
    fetchLiveCatalog: true,
    liveDelayMs: 250,
  };
  for (const a of argv) {
    if (a === '--') continue;
    if (a.startsWith('--input-tree=')) args.inputTreePath = resolveArgPath(repoRoot, a.slice(13));
    else if (a.startsWith('--input-sample=')) args.inputSamplePath = resolveArgPath(repoRoot, a.slice(15));
    else if (a.startsWith('--output-tree=')) args.outputTreePath = resolveArgPath(repoRoot, a.slice(14));
    else if (a.startsWith('--output-list=')) args.outputListPath = resolveArgPath(repoRoot, a.slice(14));
    else if (a === '--no-db') args.includeDb = false;
    else if (a === '--no-aliases') args.includeAliases = false;
    else if (a === '--no-live-catalog') args.fetchLiveCatalog = false;
    else if (a.startsWith('--live-delay-ms=')) args.liveDelayMs = Number(a.slice(16));
    else if (a === '--help' || a === '-h') printHelpAndExit(0);
    else {
      console.error(`Unknown argument: ${a}`);
      printHelpAndExit(2);
    }
  }
  return args;
}

function printHelpAndExit(code: number): never {
  console.log(
    [
      'Usage: pnpm refresh:rami-levy-categories [-- opts]',
      '',
      'Build complete RL taxonomy + flat list.',
      '',
      '  --input-tree=PATH     Existing RL tree JSON (default data/processed/categories/rami-levy.json)',
      '  --input-sample=PATH   Catalog sample JSON fallback (default data/processed/samples/rami-levy-catalog-first-100.json)',
      '  --output-tree=PATH    Output complete RL tree JSON (default data/processed/categories/rami-levy.json)',
      '  --output-list=PATH    Output flat id/name list (default data/processed/categories/rami-levy-category-list.txt)',
      '  --no-db               Skip DB RetailerProduct/alias enrichment',
      '  --no-aliases          Ignore RetailerCategoryAlias fallback names',
      '  --no-live-catalog     Skip live RL API enrichment pass (enabled by default)',
      '  --live-delay-ms=N     Delay between RL /api/catalog requests (default 250)',
    ].join('\n'),
  );
  process.exit(code);
}

function resolveArgPath(repoRoot: string, raw: string): string {
  const p = raw.trim();
  return path.isAbsolute(p) ? p : path.join(repoRoot, p);
}

async function findRepoRoot(start: string): Promise<string> {
  let dir = path.resolve(start);
  while (true) {
    try {
      await stat(path.join(dir, MARKER_FILE));
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) return start;
      dir = parent;
    }
  }
}

function asId(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}

function clean(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  return s.length > 0 ? s : undefined;
}

function numericAwareCompare(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  const aNum = Number.isFinite(na);
  const bNum = Number.isFinite(nb);
  if (aNum && bNum) return na - nb;
  return a.localeCompare(b, 'he');
}

function computeLeafCount(nodes: readonly ChainCategoryNode[]): number {
  let leaves = 0;
  const walk = (n: ChainCategoryNode) => {
    if (n.children.length === 0) leaves += 1;
    else for (const c of n.children) walk(c);
  };
  for (const n of nodes) walk(n);
  return leaves;
}

class TaxonomyBuilder {
  private departments = new Map<string, MutableNode>();
  private groups = new Map<string, MutableGroup>(); // dep|group
  private subGroups = new Map<string, MutableSubGroup>(); // dep|group|sub
  private aliasDepth0 = new Map<string, string>();
  private aliasDepth1 = new Map<string, string>();
  private aliasDepth2 = new Map<string, string>();

  private keyGroup(depId: string, groupId: string): string {
    return `${depId}|${groupId}`;
  }
  private keySub(depId: string, groupId: string, subId: string): string {
    return `${depId}|${groupId}|${subId}`;
  }

  private upsertDepartment(input: {
    id: string;
    nameHe?: string;
    slug?: string;
    url?: string;
    productCount?: number;
  }): MutableNode {
    const existing = this.departments.get(input.id) ?? {
      id: input.id,
      nameHe: input.nameHe ?? `מחלקה ${input.id}`,
      slug: input.slug,
      url: input.url,
      depth: 0,
      children: [],
      productCount: input.productCount,
    };
    if (!existing.nameHe && input.nameHe) existing.nameHe = input.nameHe;
    if (!existing.slug && input.slug) existing.slug = input.slug;
    if (!existing.url && input.url) existing.url = input.url;
    if (input.productCount != null) existing.productCount = input.productCount;
    this.departments.set(input.id, existing);
    return existing;
  }

  private upsertGroup(input: {
    depId: string;
    id: string;
    nameHe?: string;
    slug?: string;
    productCount?: number;
  }): MutableGroup {
    this.upsertDepartment({ id: input.depId });
    const key = this.keyGroup(input.depId, input.id);
    const existing = this.groups.get(key) ?? {
      parentDepartmentId: input.depId,
      id: input.id,
      nameHe: input.nameHe ?? this.aliasDepth1.get(input.id) ?? `(unknown:${input.id})`,
      slug: input.slug,
      depth: 1,
      children: [],
      productCount: input.productCount,
    };
    if (existing.nameHe.startsWith('(unknown:') && input.nameHe) existing.nameHe = input.nameHe;
    if (!existing.slug && input.slug) existing.slug = input.slug;
    if (input.productCount != null) existing.productCount = input.productCount;
    this.groups.set(key, existing);
    return existing;
  }

  private upsertSubGroup(input: {
    depId: string;
    groupId: string;
    id: string;
    nameHe?: string;
    slug?: string;
    productCount?: number;
  }): MutableSubGroup {
    this.upsertGroup({ depId: input.depId, id: input.groupId });
    const key = this.keySub(input.depId, input.groupId, input.id);
    const existing = this.subGroups.get(key) ?? {
      parentDepartmentId: input.depId,
      parentGroupId: input.groupId,
      id: input.id,
      nameHe: input.nameHe ?? this.aliasDepth2.get(input.id) ?? `(unknown:${input.id})`,
      slug: input.slug,
      depth: 2,
      children: [],
      productCount: input.productCount,
    };
    if (existing.nameHe.startsWith('(unknown:') && input.nameHe) existing.nameHe = input.nameHe;
    if (!existing.slug && input.slug) existing.slug = input.slug;
    if (input.productCount != null) existing.productCount = input.productCount;
    this.subGroups.set(key, existing);
    return existing;
  }

  ingestExistingTree(tree: ChainCategoryTree): void {
    for (const dep of tree.roots) {
      const depId = asId(dep.id);
      if (!depId) continue;
      this.upsertDepartment({
        id: depId,
        nameHe: clean(dep.nameHe),
        slug: clean(dep.slug),
        url: clean(dep.url),
        productCount: dep.productCount,
      });
      for (const grp of dep.children ?? []) {
        const groupId = asId(grp.id);
        if (!groupId) continue;
        this.upsertGroup({
          depId,
          id: groupId,
          nameHe: clean(grp.nameHe),
          slug: clean(grp.slug),
          productCount: grp.productCount,
        });
        for (const sub of grp.children ?? []) {
          const subId = asId(sub.id);
          if (!subId) continue;
          this.upsertSubGroup({
            depId,
            groupId,
            id: subId,
            nameHe: clean(sub.nameHe),
            slug: clean(sub.slug),
            productCount: sub.productCount,
          });
        }
      }
    }
  }

  ingestAlias(id: string, depth: number, name: string): void {
    if (!name) return;
    if (depth <= 0) this.aliasDepth0.set(id, name);
    else if (depth === 1) this.aliasDepth1.set(id, name);
    else this.aliasDepth2.set(id, name);
  }

  ingestCatalogRow(row: {
    depId?: string;
    depName?: string;
    depSlug?: string;
    groupId?: string;
    groupName?: string;
    groupSlug?: string;
    subId?: string;
    subName?: string;
    subSlug?: string;
  }): void {
    if (!row.depId) return;
    this.upsertDepartment({
      id: row.depId,
      nameHe: row.depName,
      slug: row.depSlug,
    });
    if (!row.groupId) return;
    this.upsertGroup({
      depId: row.depId,
      id: row.groupId,
      nameHe: row.groupName,
      slug: row.groupSlug,
    });
    if (!row.subId) return;
    this.upsertSubGroup({
      depId: row.depId,
      groupId: row.groupId,
      id: row.subId,
      nameHe: row.subName,
      slug: row.subSlug,
    });
  }

  finalizeTree(): ChainCategoryTree {
    for (const dep of this.departments.values()) {
      if (dep.nameHe.startsWith('מחלקה ') && this.aliasDepth0.has(dep.id)) {
        dep.nameHe = this.aliasDepth0.get(dep.id)!;
      }
    }
    for (const grp of this.groups.values()) {
      if (grp.nameHe.startsWith('(unknown:') && this.aliasDepth1.has(grp.id)) {
        grp.nameHe = this.aliasDepth1.get(grp.id)!;
      }
    }
    for (const sub of this.subGroups.values()) {
      if (sub.nameHe.startsWith('(unknown:') && this.aliasDepth2.has(sub.id)) {
        sub.nameHe = this.aliasDepth2.get(sub.id)!;
      }
    }

    const roots: ChainCategoryNode[] = [...this.departments.values()]
      .sort((a, b) => numericAwareCompare(a.id, b.id))
      .map((dep) => {
        const groups = [...this.groups.values()]
          .filter((g) => g.parentDepartmentId === dep.id)
          .sort((a, b) => numericAwareCompare(a.id, b.id))
          .map((grp) => {
            const subGroups = [...this.subGroups.values()]
              .filter((s) => s.parentDepartmentId === dep.id && s.parentGroupId === grp.id)
              .sort((a, b) => numericAwareCompare(a.id, b.id))
              .map(
                (sub): ChainCategoryNode => ({
                  id: sub.id,
                  nameHe: sub.nameHe,
                  slug: sub.slug,
                  depth: 2,
                  children: [],
                  productCount: sub.productCount,
                }),
              );
            return {
              id: grp.id,
              nameHe: grp.nameHe,
              slug: grp.slug,
              depth: 1,
              children: subGroups,
              productCount: grp.productCount,
            } satisfies ChainCategoryNode;
          });
        return {
          id: dep.id,
          nameHe: dep.nameHe,
          slug: dep.slug,
          url: dep.url,
          depth: 0,
          children: groups,
          productCount: dep.productCount,
        } satisfies ChainCategoryNode;
      });

    return {
      retailerSlug: 'rami-levy',
      retailerNameHe: 'רמי לוי',
      scrapedAt: new Date().toISOString(),
      source:
        'merged: data/processed/categories/rami-levy.json + RetailerProduct.rawData + RetailerCategoryAlias + sample catalog',
      roots,
      leafCount: computeLeafCount(roots),
    };
  }

  buildFlatList(tree: ChainCategoryTree): string {
    const lines: string[] = [];
    for (const dep of tree.roots) {
      lines.push(`${dep.id} | ${dep.nameHe} | department`);
      for (const grp of dep.children) {
        lines.push(`${grp.id} | ${grp.nameHe} | group | parent ${dep.id} ${dep.nameHe}`);
        for (const sub of grp.children) {
          lines.push(
            `${sub.id} | ${sub.nameHe} | subGroup | parent ${grp.id} ${grp.nameHe} | path ${dep.id}>${grp.id}>${sub.id}`,
          );
        }
      }
    }
    return lines.join('\n') + '\n';
  }
}

async function readJsonIfExists<T>(p: string): Promise<T | undefined> {
  try {
    const raw = await readFile(p, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

const RAMI_LEVY_BASE = 'https://www.rami-levy.co.il';
const MENU_URL = `${RAMI_LEVY_BASE}/api/menu`;
const CATALOG_URL = `${RAMI_LEVY_BASE}/api/catalog`;

type MenuResponse = {
  aggregations?: {
    department?: { buckets?: Array<{ key: number; doc_count: number }> };
  };
};

type CatalogProductRaw = {
  department?: { id?: number; name?: string; slug?: string };
  group?: { id?: number; name?: string; slug?: string };
  subGroup?: { id?: number; name?: string; slug?: string };
  sub_group_id?: number;
};

type CatalogResponse = { total?: number; data?: CatalogProductRaw[] };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRamiLevyDepartmentSkeleton(): Promise<Array<{ id: number; total: number }>> {
  const res = await fetch(MENU_URL, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'SupermarketAI-RL-Taxonomy/1.0',
    },
  });
  if (!res.ok) throw new Error(`Rami Levy /api/menu failed: HTTP ${res.status}`);
  const json = (await res.json()) as MenuResponse;
  const buckets = json.aggregations?.department?.buckets ?? [];
  return buckets.map((b) => ({ id: b.key, total: b.doc_count }));
}

async function fetchRamiLevyDepartmentCatalog(
  deptId: number,
  pageSize: number,
): Promise<CatalogProductRaw[]> {
  const res = await fetch(CATALOG_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'SupermarketAI-RL-Taxonomy/1.0',
    },
    body: JSON.stringify({ d: [deptId], size: pageSize }),
  });
  if (!res.ok) {
    throw new Error(`Rami Levy /api/catalog d=${deptId} failed: HTTP ${res.status}`);
  }
  const json = (await res.json()) as CatalogResponse;
  return json.data ?? [];
}

function parseRawCatalogEntry(entry: RawCatalogEntry): {
  depId?: string;
  depName?: string;
  depSlug?: string;
  groupId?: string;
  groupName?: string;
  groupSlug?: string;
  subId?: string;
  subName?: string;
  subSlug?: string;
} {
  return {
    depId: asId(entry.department?.id),
    depName: clean(entry.department?.name),
    depSlug: clean(entry.department?.slug),
    groupId: asId(entry.group?.id),
    groupName: clean(entry.group?.name),
    groupSlug: clean(entry.group?.slug),
    subId: asId(entry.subGroup?.id),
    subName: clean(entry.subGroup?.name),
    subSlug: clean(entry.subGroup?.slug),
  };
}

async function main(): Promise<void> {
  const repoRoot = await findRepoRoot(process.cwd());
  const args = parseArgs(process.argv.slice(2), repoRoot);

  console.log('— Refresh Rami Levy complete category tree —');
  console.log(`  repo root: ${repoRoot}`);
  console.log(`  input tree: ${args.inputTreePath}`);
  console.log(`  input sample: ${args.inputSamplePath}`);
  console.log(`  output tree: ${args.outputTreePath}`);
  console.log(`  output list: ${args.outputListPath}`);
  console.log(`  includeDb=${args.includeDb} includeAliases=${args.includeAliases}`);
  console.log(`  fetchLiveCatalog=${args.fetchLiveCatalog} liveDelayMs=${args.liveDelayMs}`);

  const builder = new TaxonomyBuilder();

  const existingTreeRaw = await readJsonIfExists<RawCategoryTree>(args.inputTreePath);
  if (existingTreeRaw?.roots) {
    builder.ingestExistingTree(existingTreeRaw as ChainCategoryTree);
    console.log(`  seeded from existing tree: ${existingTreeRaw.roots.length} root nodes`);
  } else {
    console.log('  warning: no existing tree loaded; starting from DB/sample only');
  }

  const sample = await readJsonIfExists<RawCatalogSample>(args.inputSamplePath);
  if (sample?.data && sample.data.length > 0) {
    for (const entry of sample.data) builder.ingestCatalogRow(parseRawCatalogEntry(entry));
    console.log(`  seeded from sample catalog: ${sample.data.length} products`);
  }

  if (args.fetchLiveCatalog) {
    console.log('  live RL API enrichment: fetching /api/menu skeleton…');
    const departments = await fetchRamiLevyDepartmentSkeleton();
    console.log(`  live RL API enrichment: scanning ${departments.length} departments from /api/catalog`);
    const progress = createProgress({
      label: 'rl-live-taxonomy',
      total: departments.length,
      intervalMs: 2_000,
    });
    for (let i = 0; i < departments.length; i++) {
      const dept = departments[i]!;
      const rows = await fetchRamiLevyDepartmentCatalog(dept.id, Math.max(dept.total + 50, 3000));
      for (const row of rows) {
        builder.ingestCatalogRow({
          depId: asId(row.department?.id ?? dept.id),
          depName: clean(row.department?.name),
          depSlug: clean(row.department?.slug),
          groupId: asId(row.group?.id),
          groupName: clean(row.group?.name),
          groupSlug: clean(row.group?.slug),
          subId: asId(row.subGroup?.id ?? row.sub_group_id),
          subName: clean(row.subGroup?.name),
          subSlug: clean(row.subGroup?.slug),
        });
      }
      progress.tick(1);
      if (args.liveDelayMs > 0 && i < departments.length - 1) await sleep(args.liveDelayMs);
    }
    progress.finish('Live API scan complete');
  }

  if (args.includeDb) {
    if (!process.env['DATABASE_URL']) {
      throw new Error('DATABASE_URL is required when includeDb=true (default).');
    }
    const prisma = getPrismaClient();

    if (args.includeAliases) {
      const aliases = await prisma.retailerCategoryAlias.findMany({
        where: { retailerSlug: RL_SLUG },
        select: {
          chainCategoryId: true,
          chainCategoryDepth: true,
          chainCategoryName: true,
        },
      });
      for (const a of aliases) {
        builder.ingestAlias(
          String(a.chainCategoryId),
          Number(a.chainCategoryDepth ?? 2),
          String(a.chainCategoryName ?? ''),
        );
      }
      console.log(`  seeded from RetailerCategoryAlias: ${aliases.length} rows`);
    }

    const total = await prisma.retailerProduct.count({
      where: { retailer: { slug: RL_SLUG } },
    });
    const progress = createProgress({
      label: 'rl-db-taxonomy',
      total,
      intervalMs: 2_000,
    });

    const pageSize = 5_000;
    let cursorId: string | undefined;
    while (true) {
      const rows = await prisma.retailerProduct.findMany({
        where: { retailer: { slug: RL_SLUG } },
        select: {
          id: true,
          chainDepartmentId: true,
          chainGroupId: true,
          chainSubGroupId: true,
          rawData: true,
        },
        orderBy: { id: 'asc' },
        take: pageSize,
        ...(cursorId
          ? {
              skip: 1,
              cursor: { id: cursorId },
            }
          : {}),
      });
      if (rows.length === 0) break;
      for (const row of rows) {
        const raw = row.rawData as RawCatalogEntry | undefined;
        builder.ingestCatalogRow({
          depId: asId(row.chainDepartmentId),
          depName: clean(raw?.department?.name),
          depSlug: clean(raw?.department?.slug),
          groupId: asId(row.chainGroupId),
          groupName: clean(raw?.group?.name),
          groupSlug: clean(raw?.group?.slug),
          subId: asId(row.chainSubGroupId),
          subName: clean(raw?.subGroup?.name),
          subSlug: clean(raw?.subGroup?.slug),
        });
      }
      progress.tick(rows.length);
      cursorId = rows[rows.length - 1]?.id;
    }
    progress.finish('DB scan complete');
  }

  const tree = builder.finalizeTree();
  const listText = builder.buildFlatList(tree);

  await mkdir(path.dirname(args.outputTreePath), { recursive: true });
  await mkdir(path.dirname(args.outputListPath), { recursive: true });
  await writeFile(args.outputTreePath, JSON.stringify(tree, null, 2) + '\n', 'utf8');
  await writeFile(args.outputListPath, listText, 'utf8');

  const unknownGroups = tree.roots
    .flatMap((d) => d.children)
    .filter((g) => g.nameHe.startsWith('(unknown:')).length;
  const unknownSubGroups = tree.roots
    .flatMap((d) => d.children)
    .flatMap((g) => g.children)
    .filter((s) => s.nameHe.startsWith('(unknown:')).length;

  console.log('\n— Done —');
  console.log(`  wrote ${args.outputTreePath}`);
  console.log(`  wrote ${args.outputListPath}`);
  console.log(`  departments: ${tree.roots.length}`);
  console.log(`  groups: ${tree.roots.reduce((n, d) => n + d.children.length, 0)}`);
  console.log(
    `  subGroups: ${tree.roots.reduce((n, d) => n + d.children.reduce((m, g) => m + g.children.length, 0), 0)}`,
  );
  console.log(`  unknown names remaining: groups=${unknownGroups} subGroups=${unknownSubGroups}`);
}

main()
  .catch((err) => {
    console.error('refresh-rami-levy-categories failed:', err);
    process.exit(1);
  })
  .finally(() => getPrismaClient().$disconnect());
