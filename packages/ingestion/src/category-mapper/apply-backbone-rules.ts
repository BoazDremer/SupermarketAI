/**
 * Internal backbone overrides — see `packages/ingestion/data/category-backbone-rules/`.
 *
 * Applied to the hand-authored / generated tree before `/general` fallback leaves
 * are synthesised, and used to migrate existing `CanonicalProduct.commonCategoryId`
 * values after a taxonomy fix.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Minimal backbone node shape — kept local to avoid a circular import with `backbone.ts`. */
export type BackboneNode = {
  id: string;
  nameHe: string;
  nameEn: string;
  icon?: string;
  parentId?: string;
  chainHints?: {
    shufersal?: readonly string[];
    ramiLevy?: readonly string[];
  };
  children: BackboneNode[];
};

const DEPT_FRUITS_VEG = 'dept/פירות-וירקות';
const DEPT_DAIRY = 'dept/חלב-ביצים-וסלטים';
const DEPT_MEAT = 'dept/בשר-ודגים';
const SPICES_BY_WEIGHT_ID = 'dept/שימורים-בישול-ואפיה/תבלינים/תבלינים-במשקל';

const FALLBACK_LEAF_SUFFIX = /\/(general|other|misc)$/;

type ChainHints = NonNullable<BackboneNode['chainHints']>;

type RulePackJson = {
  schemaVersion: number;
  departmentId: string;
  skipAutoGeneralUnder?: string[];
  productCategoryIdRemaps?: Array<{ from: string; to: string }>;
  productCategoryIdPrefixRemaps?: Array<{ fromPrefix: string; toPrefix: string }>;
};

type CategoryIdRemap = { from: string; to: string };

const RULES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../data/category-backbone-rules',
);

function readRulePack(filename: string): RulePackJson {
  const raw = readFileSync(path.join(RULES_DIR, filename), 'utf8');
  return JSON.parse(raw) as RulePackJson;
}

function mergeHints(...sources: (ChainHints | undefined)[]): ChainHints | undefined {
  const shufersal = new Set<string>();
  const ramiLevy = new Set<string>();
  for (const s of sources) {
    if (!s) continue;
    for (const c of s.shufersal ?? []) shufersal.add(c);
    for (const c of s.ramiLevy ?? []) ramiLevy.add(c);
  }
  if (shufersal.size === 0 && ramiLevy.size === 0) return undefined;
  return {
    ...(shufersal.size > 0 ? { shufersal: [...shufersal] } : {}),
    ...(ramiLevy.size > 0 ? { ramiLevy: [...ramiLevy] } : {}),
  };
}

function findNodeById(nodes: readonly BackboneNode[], id: string): BackboneNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findNodeById(n.children, id);
    if (hit) return hit;
  }
  return undefined;
}

function findChild(parent: BackboneNode, childId: string): BackboneNode | undefined {
  return parent.children.find((c) => c.id === childId);
}

function isFallbackLeafId(id: string): boolean {
  return FALLBACK_LEAF_SUFFIX.test(id);
}

/** Reorder direct children; drop /general; append any ids not listed in `preferredIds`. */
function reorderChildren(parent: BackboneNode, preferredIds: readonly string[]): void {
  const byId = new Map(parent.children.map((c) => [c.id, c]));
  const ordered: BackboneNode[] = [];
  for (const id of preferredIds) {
    const node = byId.get(id);
    if (node && !isFallbackLeafId(node.id)) {
      ordered.push(node);
      byId.delete(id);
    }
  }
  for (const node of parent.children) {
    if (byId.has(node.id) && !isFallbackLeafId(node.id)) {
      ordered.push(node);
    }
  }
  parent.children = ordered;
}

function renameYogurtDrinkLeaves(dept: BackboneNode): void {
  const walk = (node: BackboneNode): void => {
    if (node.nameHe === 'משקאות חלב ויוגורט') {
      node.nameHe = 'יוגורט ומשקאות יוגורט';
      node.nameEn = 'יוגורט ומשקאות יוגורט';
    }
    for (const child of node.children) walk(child);
  };
  walk(dept);
}

/**
 * Executable patch for `dept/פירות-וירקות` — must stay aligned with
 * `data/category-backbone-rules/dept-פירות-וירקות.json`.
 */
function mergeHintsIntoNode(
  roots: readonly BackboneNode[],
  targetId: string,
  extra: ChainHints | undefined,
): void {
  const node = findNodeById(roots, targetId);
  if (!node || !extra) return;
  node.chainHints = mergeHints(node.chainHints, extra);
}

function patchFruitsVegetablesDepartment(roots: BackboneNode[], dept: BackboneNode): void {
  const almondBulk = findChild(dept, `${DEPT_FRUITS_VEG}/קליית-השקמה-בתפזורת`);
  const almondLeaf =
    almondBulk && findChild(almondBulk, `${DEPT_FRUITS_VEG}/קליית-השקמה-בתפזורת/תבלינים-במשקל-1`);
  mergeHintsIntoNode(
    roots,
    SPICES_BY_WEIGHT_ID,
    mergeHints(almondBulk?.chainHints, almondLeaf?.chainHints),
  );

  const fruits = findChild(dept, `${DEPT_FRUITS_VEG}/פירות`);
  const vegetables = findChild(dept, `${DEPT_FRUITS_VEG}/ירקות`);
  const driedGroup = findChild(dept, `${DEPT_FRUITS_VEG}/פירות-יבשים`);
  const nuts = findChild(dept, `${DEPT_FRUITS_VEG}/פיצוחים`);

  const freshFruit =
    fruits && findChild(fruits, `${DEPT_FRUITS_VEG}/פירות/פירות-טריים`);
  const packedVegUnderFruits =
    fruits && findChild(fruits, `${DEPT_FRUITS_VEG}/פירות/ירקות-ארוזים`);
  const freshVeg = vegetables && findChild(vegetables, `${DEPT_FRUITS_VEG}/ירקות/ירקות-טריים`);
  const duplicateFreshFruit =
    vegetables && findChild(vegetables, `${DEPT_FRUITS_VEG}/ירקות/פירות-טריים`);
  const packedVeg =
    vegetables && findChild(vegetables, `${DEPT_FRUITS_VEG}/ירקות/ירקות-ארוזים`);
  const herbs = vegetables && findChild(vegetables, `${DEPT_FRUITS_VEG}/ירקות/עשבי-תיבול`);

  const driedLeafOld = nuts && findChild(nuts, `${DEPT_FRUITS_VEG}/פיצוחים/פירות-יבשים-1`);
  const naturalNutsOld = nuts && findChild(nuts, `${DEPT_FRUITS_VEG}/פיצוחים/פירות-יבשים`);
  const genericNutsOld = nuts && findChild(nuts, `${DEPT_FRUITS_VEG}/פיצוחים/פיצוחים`);
  const roasted = nuts && findChild(nuts, `${DEPT_FRUITS_VEG}/פיצוחים/פיצוחים-קלויים`);
  const munchies = nuts && findChild(nuts, `${DEPT_FRUITS_VEG}/פיצוחים/מנצ-ס`);

  const driedWholesale =
    driedGroup && findChild(driedGroup, `${DEPT_FRUITS_VEG}/פירות-יבשים/פירות-יבשים-סיטונאות`);
  const driedRetail =
    driedGroup && findChild(driedGroup, `${DEPT_FRUITS_VEG}/פירות-יבשים/פירות-יבשים-1`);
  const misfiledNutsUnderDried =
    driedGroup && findChild(driedGroup, `${DEPT_FRUITS_VEG}/פירות-יבשים/פירות-יבשים`);

  const driedFruitHints = mergeHints(
    driedGroup?.chainHints,
    driedWholesale?.chainHints,
    driedRetail?.chainHints,
    driedLeafOld?.chainHints,
  );

  const naturalNutsHints = mergeHints(
    naturalNutsOld?.chainHints,
    genericNutsOld?.chainHints,
    misfiledNutsUnderDried?.chainHints,
  );

  if (fruits) {
    fruits.children = [
      {
        id: `${DEPT_FRUITS_VEG}/פירות/פירות-טריים`,
        nameHe: 'פירות טריים',
        nameEn: 'פירות טריים',
        parentId: fruits.id,
        chainHints: mergeHints(freshFruit?.chainHints, duplicateFreshFruit?.chainHints),
        children: [],
      },
      {
        id: `${DEPT_FRUITS_VEG}/פירות/פירות-יבשים`,
        nameHe: 'פירות יבשים',
        nameEn: 'פירות יבשים',
        parentId: fruits.id,
        chainHints: driedFruitHints,
        children: [],
      },
    ];
  }

  if (vegetables) {
    vegetables.children = [
      {
        id: `${DEPT_FRUITS_VEG}/ירקות/ירקות-טריים`,
        nameHe: 'ירקות טריים',
        nameEn: 'ירקות טריים',
        parentId: vegetables.id,
        chainHints: freshVeg?.chainHints,
        children: [],
      },
      {
        id: `${DEPT_FRUITS_VEG}/ירקות/ירקות-ארוזים`,
        nameHe: 'ירקות ארוזים',
        nameEn: 'ירקות ארוזים',
        parentId: vegetables.id,
        chainHints: mergeHints(packedVeg?.chainHints, packedVegUnderFruits?.chainHints),
        children: [],
      },
      {
        id: `${DEPT_FRUITS_VEG}/ירקות/עשבי-תיבול`,
        nameHe: 'עשבי תיבול',
        nameEn: 'עשבי תיבול',
        parentId: vegetables.id,
        chainHints: herbs?.chainHints,
        children: [],
      },
    ];
  }

  if (nuts) {
    nuts.nameHe = 'פיצוחים';
    nuts.nameEn = 'פיצוחים';
    nuts.children = [
      {
        id: `${DEPT_FRUITS_VEG}/פיצוחים/פיצוחים-טבעיים`,
        nameHe: 'פיצוחים טבעיים',
        nameEn: 'פיצוחים טבעיים',
        parentId: nuts.id,
        chainHints: naturalNutsHints,
        children: [],
      },
      {
        id: `${DEPT_FRUITS_VEG}/פיצוחים/פיצוחים-קלויים`,
        nameHe: 'פיצוחים קלויים',
        nameEn: 'פיצוחים קלויים',
        parentId: nuts.id,
        chainHints: roasted?.chainHints,
        children: [],
      },
      {
        id: `${DEPT_FRUITS_VEG}/פיצוחים/מנצ-ס`,
        nameHe: "מנצ'ס",
        nameEn: "מנצ'ס",
        parentId: nuts.id,
        chainHints: munchies?.chainHints,
        children: [],
      },
    ];
  }

  const removedChildIds = new Set([
    `${DEPT_FRUITS_VEG}/פירות-יבשים`,
    `${DEPT_FRUITS_VEG}/קליית-השקמה-בתפזורת`,
    `${DEPT_FRUITS_VEG}/general`,
  ]);
  dept.children = dept.children.filter((c) => !removedChildIds.has(c.id));
}

function patchDairyDepartment(dept: BackboneNode): void {
  renameYogurtDrinkLeaves(dept);

  const milk = findChild(dept, `${DEPT_DAIRY}/חלב`);
  if (milk) {
    reorderChildren(milk, [
      `${DEPT_DAIRY}/חלב/חלב-טרי`,
      `${DEPT_DAIRY}/חלב/חלב-עמיד-ומלבין`,
      `${DEPT_DAIRY}/חלב/משקאות-חלב`,
      `${DEPT_DAIRY}/חלב/משקאות-חלב-ויוגורט`,
    ]);
  }

  const eggs = findChild(dept, `${DEPT_DAIRY}/ביצים`);
  if (eggs) {
    eggs.children = eggs.children.filter((c) => !isFallbackLeafId(c.id));
  }

  const butter = findChild(dept, `${DEPT_DAIRY}/חמאה-מרגרינה-שמנת`);
  if (butter) {
    reorderChildren(butter, [
      `${DEPT_DAIRY}/חמאה-מרגרינה-שמנת/חמאה`,
      `${DEPT_DAIRY}/חמאה-מרגרינה-שמנת/מרגרינה`,
    ]);
  }

  const cheese = findChild(dept, `${DEPT_DAIRY}/גבינות`);
  if (cheese) {
    reorderChildren(cheese, [
      `${DEPT_DAIRY}/גבינות/גבינת-קוטג`,
      `${DEPT_DAIRY}/גבינות/גבינה-לבנה`,
      `${DEPT_DAIRY}/גבינות/גבינה-צהובה`,
    ]);
  }

  const salads = findChild(dept, `${DEPT_DAIRY}/סלטים`);
  if (salads) {
    const vegSalad = findChild(salads, `${DEPT_DAIRY}/סלטים/סלטי-ירקות`);
    if (vegSalad) {
      vegSalad.nameHe = 'סלטי ירקות וביצים';
      vegSalad.nameEn = 'סלטי ירקות וביצים';
    }
    salads.children = salads.children.filter((c) => !isFallbackLeafId(c.id));
    reorderChildren(salads, [
      `${DEPT_DAIRY}/סלטים/סלטי-חומוס`,
      `${DEPT_DAIRY}/סלטים/סלטי-טחינה`,
      `${DEPT_DAIRY}/סלטים/סלטי-חצילים`,
      `${DEPT_DAIRY}/סלטים/סלטי-ירקות`,
      `${DEPT_DAIRY}/סלטים/סלטי-דגים`,
      `${DEPT_DAIRY}/סלטים/ממרחים-ומתבלים-מצוננים`,
      `${DEPT_DAIRY}/סלטים/סלטי-כרוב`,
      `${DEPT_DAIRY}/סלטים/אריסה-וסחוג`,
    ]);
  }

  const chilledFood = findChild(dept, `${DEPT_DAIRY}/מזון-מצונן`);
  if (chilledFood) {
    chilledFood.children = chilledFood.children.filter((c) => !isFallbackLeafId(c.id));
  }

  dept.children = dept.children.filter((c) => !isFallbackLeafId(c.id));
}

function patchMeatDepartment(roots: readonly BackboneNode[], dept: BackboneNode): void {
  reorderChildren(dept, [
    `${DEPT_MEAT}/עוף-טרי`,
    `${DEPT_MEAT}/עוף-קפוא`,
    `${DEPT_MEAT}/בשר-בקר-וכבש-טרי`,
    `${DEPT_MEAT}/בשרים-על-האש`,
    `${DEPT_MEAT}/בשר-קפוא`,
    `${DEPT_MEAT}/דגים`,
    `${DEPT_MEAT}/נקניקיות-ונקניקים`,
    `${DEPT_MEAT}/אוכל-מוכן`,
    `${DEPT_MEAT}/תחליפי-בשר-קפואים`,
    `${DEPT_MEAT}/מזון-מצונן`,
  ]);

  const freshMeat = findChild(dept, `${DEPT_MEAT}/בשר-בקר-וכבש-טרי`);
  if (freshMeat) {
    freshMeat.nameHe = 'בשר טרי';
    freshMeat.nameEn = 'בשר טרי';
    const nestedFrozen = findChild(freshMeat, `${DEPT_MEAT}/בשר-בקר-וכבש-טרי/בשר-קפוא`);
    if (nestedFrozen) {
      mergeHintsIntoNode(roots, `${DEPT_MEAT}/בשר-קפוא/בשר-קפוא`, nestedFrozen.chainHints);
    }
    freshMeat.children = freshMeat.children.filter(
      (c) => c.id !== `${DEPT_MEAT}/בשר-בקר-וכבש-טרי/בשר-קפוא` && !isFallbackLeafId(c.id),
    );
  }

  dept.children = dept.children.filter((c) => !isFallbackLeafId(c.id));
}

function loadAllRulePacks(): RulePackJson[] {
  return [
    readRulePack('dept-פירות-וירקות.json'),
    readRulePack('dept-חלב-ביצים-וסלטים.json'),
    readRulePack('dept-בשר-ודגים.json'),
  ];
}

/** Parents that must not receive an auto-synthesised `…/general` leaf. */
export function backboneSkipAutoGeneralParents(): ReadonlySet<string> {
  const out = new Set<string>();
  for (const pack of loadAllRulePacks()) {
    for (const id of pack.skipAutoGeneralUnder ?? []) out.add(id);
  }
  return out;
}

/** Exact + prefix remaps for existing canonical products after taxonomy edits. */
export function backboneProductCategoryIdRemaps(): readonly CategoryIdRemap[] {
  const exact: CategoryIdRemap[] = [];
  const prefixes: Array<{ fromPrefix: string; toPrefix: string }> = [];
  for (const pack of loadAllRulePacks()) {
    for (const row of pack.productCategoryIdRemaps ?? []) exact.push(row);
    for (const row of pack.productCategoryIdPrefixRemaps ?? []) prefixes.push(row);
  }
  return exact;
}

export function remapCanonicalCategoryId(
  categoryId: string | null | undefined,
  remaps: readonly CategoryIdRemap[],
  prefixRemaps: ReadonlyArray<{ fromPrefix: string; toPrefix: string }>,
): string | null | undefined {
  if (!categoryId) return categoryId;
  for (const { from, to } of remaps) {
    if (categoryId === from) return to;
  }
  for (const { fromPrefix, toPrefix } of prefixRemaps) {
    if (categoryId === fromPrefix || categoryId.startsWith(`${fromPrefix}/`)) {
      return categoryId.replace(fromPrefix, toPrefix);
    }
  }
  return categoryId;
}

export function loadPrefixRemaps(): ReadonlyArray<{ fromPrefix: string; toPrefix: string }> {
  const out: Array<{ fromPrefix: string; toPrefix: string }> = [];
  for (const pack of loadAllRulePacks()) {
    for (const row of pack.productCategoryIdPrefixRemaps ?? []) out.push(row);
  }
  return out;
}

/**
 * Apply all internal rule packs to a backbone tree (mutates nodes in place for
 * known departments; returns a new top-level array).
 */
export function applyInternalBackboneRules(
  roots: readonly BackboneNode[],
): BackboneNode[] {
  const cloned = structuredClone(roots) as BackboneNode[];
  const fruitsDept = findNodeById(cloned, DEPT_FRUITS_VEG);
  if (fruitsDept) patchFruitsVegetablesDepartment(cloned, fruitsDept);

  const dairyDept = findNodeById(cloned, DEPT_DAIRY);
  if (dairyDept) patchDairyDepartment(dairyDept);

  const meatDept = findNodeById(cloned, DEPT_MEAT);
  if (meatDept) patchMeatDepartment(cloned, meatDept);

  return cloned;
}

/** Short status for CLI logs — confirms rule packs loaded and the fruits dept shape. */
export function logBackboneRulesStatus(): void {
  const packs = loadAllRulePacks().map((p) => p.departmentId);
  const sample = applyInternalBackboneRules([
    {
      id: DEPT_FRUITS_VEG,
      nameHe: 'פירות וירקות',
      nameEn: 'פירות וירקות',
      children: [{ id: `${DEPT_FRUITS_VEG}/פירות`, nameHe: 'פירות', nameEn: 'פירות', children: [] }],
    },
  ]);
  const dept = findNodeById(sample, DEPT_FRUITS_VEG);
  const fruits = dept && findChild(dept, `${DEPT_FRUITS_VEG}/פירות`);
  const fruitLeafIds = fruits?.children.map((c) => c.id.split('/').pop() ?? c.id) ?? [];
  console.log(
    `[backbone-rules] loaded ${packs.length} rule pack(s): ${packs.join(', ') || '(none)'}`,
  );
  console.log(
    `[backbone-rules] after patch, dept/פירות-וירקות/פירות leaves: ${fruitLeafIds.join(', ') || '(missing)'}`,
  );

  const dairySample = applyInternalBackboneRules([
    {
      id: DEPT_DAIRY,
      nameHe: 'חלב ביצים וסלטים',
      nameEn: 'חלב ביצים וסלטים',
      children: [
        {
          id: `${DEPT_DAIRY}/חלב`,
          nameHe: 'חלב',
          nameEn: 'חלב',
          children: [
            { id: `${DEPT_DAIRY}/חלב/חלב-טרי`, nameHe: 'חלב טרי', nameEn: 'חלב טרי', children: [] },
            {
              id: `${DEPT_DAIRY}/חלב/חלב-עמיד-ומלבין`,
              nameHe: 'חלב עמיד ומלבין',
              nameEn: 'חלב עמיד ומלבין',
              children: [],
            },
            {
              id: `${DEPT_DAIRY}/חלב/משקאות-חלב-ויוגורט`,
              nameHe: 'משקאות חלב ויוגורט',
              nameEn: 'משקאות חלב ויוגורט',
              children: [],
            },
            {
              id: `${DEPT_DAIRY}/חלב/משקאות-חלב`,
              nameHe: 'משקאות חלב',
              nameEn: 'משקאות חלב',
              children: [],
            },
          ],
        },
      ],
    },
  ]);
  const dairyDept = findNodeById(dairySample, DEPT_DAIRY);
  const milk = dairyDept && findChild(dairyDept, `${DEPT_DAIRY}/חלב`);
  const milkLeafIds = milk?.children.map((c) => c.id.split('/').pop() ?? c.id) ?? [];
  const yogurt = milk?.children.find((c) => c.id.endsWith('משקאות-חלב-ויוגורט'));
  console.log(
    `[backbone-rules] after patch, dept/חלב-ביצים-וסלטים/חלב leaves: ${milkLeafIds.join(', ') || '(missing)'}`,
  );
  console.log(
    `[backbone-rules] yogurt drink label: ${yogurt?.nameHe ?? '(missing)'}`,
  );
}
