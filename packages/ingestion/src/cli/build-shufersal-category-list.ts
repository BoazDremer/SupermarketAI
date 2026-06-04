/**
 * CLI: `pnpm build:shufersal-category-list`
 *
 * Reads `data/processed/categories/shufersal.json` and writes a flat TXT list
 * with every node (including leaves), preserving full hierarchy context.
 */

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ChainCategoryNode, ChainCategoryTree } from '../scrapers/types.js';

type Args = {
  inputPath: string;
  outputPath: string;
};

const MARKER_FILE = 'pnpm-workspace.yaml';

function parseArgs(argv: readonly string[], repoRoot: string): Args {
  const args: Args = {
    inputPath: path.join(repoRoot, 'data/processed/categories/shufersal.json'),
    outputPath: path.join(repoRoot, 'data/processed/categories/shufersal-category-list.txt'),
  };
  for (const a of argv) {
    if (a === '--') continue;
    if (a.startsWith('--input=')) args.inputPath = resolveArgPath(repoRoot, a.slice('--input='.length));
    else if (a.startsWith('--output=')) args.outputPath = resolveArgPath(repoRoot, a.slice('--output='.length));
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
      'Usage: pnpm build:shufersal-category-list [-- opts]',
      '',
      'Build flat list from shufersal category tree.',
      '',
      '  --input=PATH   Input tree JSON (default data/processed/categories/shufersal.json)',
      '  --output=PATH  Output TXT list (default data/processed/categories/shufersal-category-list.txt)',
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

function joinNamePath(ancestors: readonly ChainCategoryNode[], node: ChainCategoryNode): string {
  return [...ancestors.map((a) => a.nameHe), node.nameHe].join(' > ');
}

function joinIdPath(ancestors: readonly ChainCategoryNode[], node: ChainCategoryNode): string {
  return [...ancestors.map((a) => a.id), node.id].join('>');
}

function levelLabel(node: ChainCategoryNode, isLeaf: boolean): string {
  if (isLeaf) return 'leaf';
  switch (node.depth) {
    case 0:
      return 'department';
    case 1:
      return 'category';
    case 2:
      return 'subCategory';
    default:
      return `depth${node.depth}`;
  }
}

function buildFlatList(tree: ChainCategoryTree): string {
  const lines: string[] = [];
  const walk = (node: ChainCategoryNode, ancestors: readonly ChainCategoryNode[]) => {
    const isLeaf = node.children.length === 0;
    const label = levelLabel(node, isLeaf);
    const parent = ancestors.at(-1);
    const idPath = joinIdPath(ancestors, node);
    const namePath = joinNamePath(ancestors, node);
    const parentPart = parent ? ` | parent ${parent.id} ${parent.nameHe}` : '';
    const slugPart = node.slug ? ` | slug ${node.slug}` : '';
    const urlPart = node.url ? ` | url ${node.url}` : '';
    const productCountPart =
      node.productCount != null ? ` | productCount ${node.productCount}` : '';
    lines.push(
      `${node.id} | ${node.nameHe} | ${label}${parentPart} | depth ${node.depth} | path ${idPath} | pathHe ${namePath}${slugPart}${urlPart}${productCountPart}`,
    );
    for (const child of node.children) {
      walk(child, [...ancestors, node]);
    }
  };
  for (const root of tree.roots) {
    walk(root, []);
  }
  return lines.join('\n') + '\n';
}

async function main(): Promise<void> {
  const repoRoot = await findRepoRoot(process.cwd());
  const args = parseArgs(process.argv.slice(2), repoRoot);
  console.log('— Build Shufersal category list —');
  console.log(`  input: ${args.inputPath}`);
  console.log(`  output: ${args.outputPath}`);

  const raw = await readFile(args.inputPath, 'utf8');
  const tree = JSON.parse(raw) as ChainCategoryTree;

  if (tree.retailerSlug !== 'shufersal') {
    throw new Error(`Input retailerSlug is "${tree.retailerSlug ?? 'unknown'}" (expected "shufersal").`);
  }

  const text = buildFlatList(tree);
  await mkdir(path.dirname(args.outputPath), { recursive: true });
  await writeFile(args.outputPath, text, 'utf8');

  const lines = text.trimEnd().length > 0 ? text.trimEnd().split('\n').length : 0;
  console.log('— Done —');
  console.log(`  wrote ${args.outputPath}`);
  console.log(`  rows: ${lines}`);
}

main().catch((err) => {
  console.error('build-shufersal-category-list failed:', err);
  process.exit(1);
});

