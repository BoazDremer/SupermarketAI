import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  applyInternalBackboneRules,
  backboneProductCategoryIdRemaps,
  loadPrefixRemaps,
  remapCanonicalCategoryId,
} from '../category-mapper/apply-backbone-rules.js';
import type { BackboneNode } from '../category-mapper/backbone.js';

type ChainCategoryNode = {
  id: string;
  nameHe: string;
  slug?: string;
  depth: number;
  children: ChainCategoryNode[];
};

type ChainCategoryTree = {
  retailerSlug: 'rami-levy' | 'shufersal';
  retailerNameHe: string;
  scrapedAt: string;
  source: string;
  roots: ChainCategoryNode[];
  leafCount: number;
};

type CommonNode = {
  id: string;
  nameHe: string;
  nameEn: string;
  icon?: string;
  parentId?: string;
  chainHints?: {
    shufersal?: string[];
    ramiLevy?: string[];
  };
  children?: CommonNode[];
};

type MappingRow = {
  retailer: 'rami-levy' | 'shufersal';
  chainId: string;
  chainNameHe: string;
  chainDepth: number;
  chainParent?: string;
  commonId: string;
  commonNameHe: string;
  matchKind: string;
  score?: number;
};

type Args = {
  rlPath: string;
  shufPath: string;
  outCommonPath: string;
  outMappingPath: string;
};

const MARKER_FILE = 'pnpm-workspace.yaml';

function parseArgs(argv: readonly string[], repoRoot: string): Args {
  const args: Args = {
    rlPath: path.join(repoRoot, 'data/processed/categories/rami-levy.json'),
    shufPath: path.join(repoRoot, 'data/processed/categories/shufersal.json'),
    outCommonPath: path.join(repoRoot, 'data/processed/categories/common.proposed.json'),
    outMappingPath: path.join(
      repoRoot,
      'data/processed/categories/common.proposed.mapping-test.json',
    ),
  };
  for (const a of argv) {
    if (a === '--') continue;
    if (a.startsWith('--rl=')) args.rlPath = resolveArgPath(repoRoot, a.slice('--rl='.length));
    else if (a.startsWith('--shuf=')) args.shufPath = resolveArgPath(repoRoot, a.slice('--shuf='.length));
    else if (a.startsWith('--out-common=')) {
      args.outCommonPath = resolveArgPath(repoRoot, a.slice('--out-common='.length));
    } else if (a.startsWith('--out-mapping=')) {
      args.outMappingPath = resolveArgPath(repoRoot, a.slice('--out-mapping='.length));
    } else if (a === '--help' || a === '-h') {
      printHelpAndExit(0);
    } else {
      console.error(`Unknown argument: ${a}`);
      printHelpAndExit(2);
    }
  }
  return args;
}

function printHelpAndExit(code: number): never {
  console.log(
    [
      'Usage: pnpm generate:rl-based-common-tree [-- opts]',
      '',
      'Builds a new RL-based 3-level common tree and full leaf assignment report',
      'for RL + Shufersal leaves.',
      '',
      '  --rl=PATH           RL tree JSON (default data/processed/categories/rami-levy.json)',
      '  --shuf=PATH         Shufersal tree JSON (default data/processed/categories/shufersal.json)',
      '  --out-common=PATH   Output common proposed JSON',
      '  --out-mapping=PATH  Output mapping audit JSON',
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

function slugifyIdPart(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

function enFallback(he: string): string {
  // We prefer stable ids and Hebrew labels; EN can be refined later.
  return he;
}

function tokenizeHebrew(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/["'`]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function jaccard(a: readonly string[], b: readonly string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter += 1;
  const union = sa.size + sb.size - inter;
  return union > 0 ? inter / union : 0;
}

function walkNodes(
  roots: readonly ChainCategoryNode[],
  visit: (node: ChainCategoryNode, parent: ChainCategoryNode | undefined, ancestors: ChainCategoryNode[]) => void,
): void {
  const go = (
    node: ChainCategoryNode,
    parent: ChainCategoryNode | undefined,
    ancestors: ChainCategoryNode[],
  ) => {
    visit(node, parent, ancestors);
    for (const child of node.children ?? []) go(child, node, [...ancestors, node]);
  };
  for (const root of roots) go(root, undefined, []);
}

function iconForDept(name: string): string {
  if (name.includes('חלב')) return 'Milk';
  if (name.includes('פירות') || name.includes('ירקות')) return 'Salad';
  if (name.includes('בשר') || name.includes('דגים')) return 'Beef';
  if (name.includes('קפוא')) return 'Snowflake';
  if (name.includes('משקאות')) return 'CupSoda';
  if (name.includes('פארם') || name.includes('בריאות')) return 'Pill';
  if (name.includes('לחם') || name.includes('מאפים')) return 'Croissant';
  if (name.includes('בית') || name.includes('אחזקת')) return 'SprayCan';
  return 'Package';
}

function buildRlBasedTree(rl: ChainCategoryTree): {
  backbone: CommonNode[];
  leafById: Map<string, CommonNode>;
  mappings: MappingRow[];
} {
  const backbone: CommonNode[] = [];
  const leafById = new Map<string, CommonNode>();
  const mappings: MappingRow[] = [];

  for (const dep of rl.roots) {
    const depId = `dept/${slugifyIdPart(dep.slug || dep.nameHe || dep.id) || dep.id}`;
    const depNode: CommonNode = {
      id: depId,
      nameHe: dep.nameHe,
      nameEn: enFallback(dep.nameHe),
      icon: iconForDept(dep.nameHe),
      chainHints: { ramiLevy: [dep.id] },
      children: [],
    };
    backbone.push(depNode);

    for (const group of dep.children ?? []) {
      const groupIdPart = slugifyIdPart(group.slug || group.nameHe || group.id) || group.id;
      const groupId = `${depId}/${groupIdPart}`;
      const groupNode: CommonNode = {
        id: groupId,
        nameHe: group.nameHe,
        nameEn: enFallback(group.nameHe),
        parentId: depId,
        chainHints: { ramiLevy: [group.id] },
        children: [],
      };
      depNode.children!.push(groupNode);

      if ((group.children ?? []).length === 0) {
        const leafId = `${groupId}/general`;
        const leafNode: CommonNode = {
          id: leafId,
          nameHe: 'כללי',
          nameEn: 'General',
          parentId: groupId,
          chainHints: { ramiLevy: [group.id] },
          children: [],
        };
        groupNode.children!.push(leafNode);
        leafById.set(leafId, leafNode);
        mappings.push({
          retailer: 'rami-levy',
          chainId: group.id,
          chainNameHe: group.nameHe,
          chainDepth: group.depth,
          chainParent: dep.id,
          commonId: leafId,
          commonNameHe: leafNode.nameHe,
          matchKind: 'direct-group-general',
          score: 1,
        });
      } else {
        for (const sub of group.children) {
          const subIdPart = slugifyIdPart(sub.slug || sub.nameHe || sub.id) || sub.id;
          const leafId = `${groupId}/${subIdPart}`;
          const leafNode: CommonNode = {
            id: leafId,
            nameHe: sub.nameHe,
            nameEn: enFallback(sub.nameHe),
            parentId: groupId,
            chainHints: { ramiLevy: [sub.id] },
            children: [],
          };
          groupNode.children!.push(leafNode);
          leafById.set(leafId, leafNode);
          mappings.push({
            retailer: 'rami-levy',
            chainId: sub.id,
            chainNameHe: sub.nameHe,
            chainDepth: sub.depth,
            chainParent: group.id,
            commonId: leafId,
            commonNameHe: leafNode.nameHe,
            matchKind: 'direct-subgroup',
            score: 1,
          });
        }
      }
    }
  }

  return { backbone, leafById, mappings };
}

function collectTerminalLeaves(roots: readonly CommonNode[]): Map<string, CommonNode> {
  const leafById = new Map<string, CommonNode>();
  const visit = (node: CommonNode) => {
    if ((node.children ?? []).length === 0) leafById.set(node.id, node);
    else for (const c of node.children ?? []) visit(c);
  };
  for (const root of roots) visit(root);
  return leafById;
}

function nearestLeaf(
  shufLeaf: ChainCategoryNode,
  shufAncestors: readonly ChainCategoryNode[],
  leafById: ReadonlyMap<string, CommonNode>,
): { leaf: CommonNode; score: number } {
  const sourceTokens = tokenizeHebrew(
    [...shufAncestors.map((a) => a.nameHe), shufLeaf.nameHe].join(' '),
  );
  let best: { leaf: CommonNode; score: number } | undefined;
  for (const leaf of leafById.values()) {
    const leafTokens = tokenizeHebrew(
      [leaf.nameHe, leaf.parentId ?? '', leaf.id.replaceAll('/', ' ')].join(' '),
    );
    const score = jaccard(sourceTokens, leafTokens);
    if (!best || score > best.score) best = { leaf, score };
  }
  if (best) return best;
  // Fallback impossible unless RL tree had no leaves.
  throw new Error('No common leaves available for Shufersal matching');
}

function assignShufersalLeaves(
  shuf: ChainCategoryTree,
  leafById: ReadonlyMap<string, CommonNode>,
): MappingRow[] {
  const rows: MappingRow[] = [];
  walkNodes(shuf.roots, (node, parent, ancestors) => {
    if ((node.children ?? []).length > 0) return;
    // Assign every leaf from shufersal to a common leaf.
    const { leaf, score } = nearestLeaf(node, ancestors, leafById);
    if (!leaf.chainHints) leaf.chainHints = {};
    if (!leaf.chainHints.shufersal) leaf.chainHints.shufersal = [];
    if (!leaf.chainHints.shufersal.includes(node.id)) leaf.chainHints.shufersal.push(node.id);
    rows.push({
      retailer: 'shufersal',
      chainId: node.id,
      chainNameHe: node.nameHe,
      chainDepth: node.depth,
      chainParent: parent?.id,
      commonId: leaf.id,
      commonNameHe: leaf.nameHe,
      matchKind: score > 0 ? 'name-similarity' : 'fallback-first-leaf',
      score,
    });
  });
  return rows;
}

function summarize(
  rows: readonly MappingRow[],
): {
  ramiLevy: { total: number; direct: number; inherited: number; catchAll: number; ambiguous: number };
  shufersal: { total: number; direct: number; inherited: number; catchAll: number; ambiguous: number };
} {
  const init = { total: 0, direct: 0, inherited: 0, catchAll: 0, ambiguous: 0 };
  const out = { ramiLevy: { ...init }, shufersal: { ...init } };
  for (const row of rows) {
    const bucket = row.retailer === 'rami-levy' ? out.ramiLevy : out.shufersal;
    bucket.total += 1;
    if (row.matchKind.startsWith('direct')) bucket.direct += 1;
    else if (row.matchKind.startsWith('inherited')) bucket.inherited += 1;
    else if (row.matchKind.startsWith('catch-all')) bucket.catchAll += 1;
  }
  return out;
}

async function main(): Promise<void> {
  const repoRoot = await findRepoRoot(process.cwd());
  const args = parseArgs(process.argv.slice(2), repoRoot);
  const rl = JSON.parse(await readFile(args.rlPath, 'utf8')) as ChainCategoryTree;
  const shuf = JSON.parse(await readFile(args.shufPath, 'utf8')) as ChainCategoryTree;

  const built = buildRlBasedTree(rl);
  const backbone = applyInternalBackboneRules(built.backbone as BackboneNode[]) as CommonNode[];
  const leafById = collectTerminalLeaves(backbone);
  const exactRemaps = backboneProductCategoryIdRemaps();
  const prefixRemaps = loadPrefixRemaps();
  const rlMappings = built.mappings.map((row) => ({
    ...row,
    commonId:
      remapCanonicalCategoryId(row.commonId, exactRemaps, prefixRemaps) ?? row.commonId,
    commonNameHe: leafById.get(
      remapCanonicalCategoryId(row.commonId, exactRemaps, prefixRemaps) ?? row.commonId,
    )?.nameHe ?? row.commonNameHe,
  }));
  const shufMappings = assignShufersalLeaves(shuf, leafById);
  const allMappings = [...rlMappings, ...shufMappings];
  const summary = summarize(allMappings);

  const common = {
    _meta: {
      purpose:
        'RL-based 3-level common category tree. Structure is derived from RL department/group/subgroup while still acting as app-common taxonomy with full RL+Shufersal leaf assignment.',
      depths:
        'depth 0 = department, depth 1 = category, depth 2 = sub-category (leaf)',
      strategy:
        'RL hierarchy is the structural backbone. Groups without RL subgroups receive a synthetic /general leaf. Internal rule packs in data/category-backbone-rules/ are applied next. Shufersal leaves are assigned to common leaves via deterministic name similarity.',
      generatedAt: new Date().toISOString(),
      sourceRamiLevy: path.relative(repoRoot, args.rlPath),
      sourceShufersal: path.relative(repoRoot, args.shufPath),
    },
    backbone,
  };

  const mappingAudit = {
    _meta: {
      purpose:
        'Mapping audit for RL-based common tree. Every RL leaf and every Shufersal leaf is assigned to exactly one common leaf.',
      generatedAt: new Date().toISOString(),
      proposedTree: path.relative(repoRoot, args.outCommonPath),
      matchKindLegend: {
        'direct-subgroup': 'RL subgroup code mapped directly to corresponding common leaf',
        'direct-group-general':
          'RL group without subgroups mapped to synthetic /general leaf',
        'name-similarity':
          'Shufersal leaf mapped to nearest common leaf by token similarity',
        'fallback-first-leaf':
          'No lexical overlap; fallback to first available common leaf',
      },
    },
    summary,
    ramiLevy: rlMappings,
    shufersal: shufMappings,
  };

  await mkdir(path.dirname(args.outCommonPath), { recursive: true });
  await mkdir(path.dirname(args.outMappingPath), { recursive: true });
  await writeFile(args.outCommonPath, JSON.stringify(common, null, 2) + '\n', 'utf8');
  await writeFile(args.outMappingPath, JSON.stringify(mappingAudit, null, 2) + '\n', 'utf8');

  process.stdout.write(
    [
      'Generated RL-based common tree and mapping audit:',
      `  common: ${args.outCommonPath}`,
      `  mapping: ${args.outMappingPath}`,
      `  RL mapped leaves: ${rlMappings.length}`,
      `  Shufersal mapped leaves: ${shufMappings.length}`,
      `  Common leaves: ${leafById.size}`,
    ].join('\n') + '\n',
  );
}

main().catch((err) => {
  console.error('generate-rl-based-common-tree failed:', err);
  process.exit(1);
});

