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
const DEPT_BREAD = 'dept/לחם-מאפים-והמאפייה-הטריה';
const DEPT_LEGUMES = 'dept/קטניות-ודגנים';
const DEPT_PANTRY = 'dept/שימורים-בישול-ואפיה';
const DEPT_BEVERAGES = 'dept/משקאות';
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
    `${DEPT_MEAT}/בשר-קפוא`,
    `${DEPT_MEAT}/בשרים-על-האש`,
    `${DEPT_MEAT}/דגים`,
    `${DEPT_MEAT}/נקניקיות-ונקניקים`,
    `${DEPT_MEAT}/אוכל-מוכן`,
    `${DEPT_MEAT}/תחליפי-בשר-קפואים`,
  ]);

  const chilledFood = findChild(dept, `${DEPT_MEAT}/מזון-מצונן`);
  if (chilledFood) {
    mergeHintsIntoNode(roots, `${DEPT_MEAT}/נקניקיות-ונקניקים/נקניק`, chilledFood.chainHints);
    const chilledNaknik = findChild(chilledFood, `${DEPT_MEAT}/מזון-מצונן/נקניק`);
    if (chilledNaknik) {
      mergeHintsIntoNode(roots, `${DEPT_MEAT}/נקניקיות-ונקניקים/נקניק`, chilledNaknik.chainHints);
    }
  }

  const stripGeneralUnder = [
    { group: `${DEPT_MEAT}/עוף-טרי`, hintTarget: `${DEPT_MEAT}/עוף-טרי/עוף-טרי-איכותי` },
    { group: `${DEPT_MEAT}/עוף-קפוא`, hintTarget: `${DEPT_MEAT}/עוף-קפוא/עוף-קפוא` },
    { group: `${DEPT_MEAT}/בשר-קפוא`, hintTarget: `${DEPT_MEAT}/בשר-קפוא/בשר-קפוא` },
    { group: `${DEPT_MEAT}/בשרים-על-האש`, hintTarget: `${DEPT_MEAT}/בשרים-על-האש/המבורגר` },
    { group: `${DEPT_MEAT}/דגים`, hintTarget: `${DEPT_MEAT}/דגים/דגים-טריים` },
    { group: `${DEPT_MEAT}/נקניקיות-ונקניקים`, hintTarget: `${DEPT_MEAT}/נקניקיות-ונקניקים/נקניק` },
    { group: `${DEPT_MEAT}/אוכל-מוכן`, hintTarget: `${DEPT_MEAT}/אוכל-מוכן/מוצרי-בשר-ועוף-מוכנים` },
    {
      group: `${DEPT_MEAT}/תחליפי-בשר-קפואים`,
      hintTarget: `${DEPT_MEAT}/תחליפי-בשר-קפואים/תחליפי-בשר-קפואים`,
    },
  ] as const;
  for (const { group, hintTarget } of stripGeneralUnder) {
    const node = findChild(dept, group);
    if (!node) continue;
    mergeHintsIntoNode(roots, hintTarget, node.chainHints);
    node.children = node.children.filter((c) => !isFallbackLeafId(c.id));
  }

  const delicatessen = findChild(dept, `${DEPT_MEAT}/נקניקיות-ונקניקים`);
  if (delicatessen) {
    delicatessen.nameHe = 'נקניקים ונקניקיות';
    delicatessen.nameEn = 'נקניקים ונקניקיות';
    const mealId = `${DEPT_MEAT}/נקניקיות-ונקניקים/ארוחה-מוכנה-מצוננת`;
    const mealIdx = delicatessen.children.findIndex((c) => c.id === mealId);
    if (mealIdx >= 0) {
      const [meal] = delicatessen.children.splice(mealIdx, 1);
      meal.parentId = `${DEPT_MEAT}/אוכל-מוכן`;
      const readyFood = findChild(dept, `${DEPT_MEAT}/אוכל-מוכן`);
      if (readyFood) {
        readyFood.children.push(meal);
        reorderChildren(readyFood, [
          `${DEPT_MEAT}/אוכל-מוכן/מוצרי-בשר-ועוף-מוכנים`,
          mealId,
        ]);
      }
    }
  }

  const frozenPoultry = findChild(dept, `${DEPT_MEAT}/עוף-קפוא`);
  if (frozenPoultry) {
    const mehadrin = findChild(frozenPoultry, `${DEPT_MEAT}/עוף-קפוא/עוף-קפוא-מהדרין`);
    if (mehadrin) {
      mehadrin.nameHe = 'עוף קפוא - כשרויות מיוחדות';
      mehadrin.nameEn = 'עוף קפוא - כשרויות מיוחדות';
    }
    reorderChildren(frozenPoultry, [
      `${DEPT_MEAT}/עוף-קפוא/עוף-קפוא`,
      `${DEPT_MEAT}/עוף-קפוא/עוף-קפוא-טחון`,
      `${DEPT_MEAT}/עוף-קפוא/עוף-קפוא-מהדרין`,
      `${DEPT_MEAT}/עוף-קפוא/עוף-קפוא-כשרות-רובין`,
    ]);
  }

  const freshPoultry = findChild(dept, `${DEPT_MEAT}/עוף-טרי`);
  if (freshPoultry) {
    const mergeFreshInto = (fromId: string, toId: string) => {
      const from = findChild(freshPoultry, fromId);
      if (from) mergeHintsIntoNode(roots, toId, from.chainHints);
    };
    mergeFreshInto(
      `${DEPT_MEAT}/עוף-טרי/עוף-טרי-פרימיום-ארוז`,
      `${DEPT_MEAT}/עוף-טרי/עוף-טרי-ארוז`,
    );
    mergeFreshInto(
      `${DEPT_MEAT}/עוף-טרי/עוף-טרי-מחפוד`,
      `${DEPT_MEAT}/עוף-טרי/עוף-טרי-איכותי`,
    );
    mergeFreshInto(
      `${DEPT_MEAT}/עוף-טרי/עוף-טרי-בכשרות-קהילות`,
      `${DEPT_MEAT}/עוף-טרי/עוף-והודו-ארוז-כשרויות-מיוחדות`,
    );
    mergeFreshInto(
      `${DEPT_MEAT}/עוף-טרי/עוף-טרי-כשרות-רובין`,
      `${DEPT_MEAT}/עוף-טרי/עוף-והודו-ארוז-כשרויות-מיוחדות`,
    );
    const removedFreshIds = new Set([
      `${DEPT_MEAT}/עוף-טרי/עוף-טרי-פרימיום-ארוז`,
      `${DEPT_MEAT}/עוף-טרי/עוף-טרי-מחפוד`,
      `${DEPT_MEAT}/עוף-טרי/עוף-טרי-בכשרות-קהילות`,
      `${DEPT_MEAT}/עוף-טרי/עוף-טרי-כשרות-רובין`,
    ]);
    freshPoultry.children = freshPoultry.children.filter((c) => !removedFreshIds.has(c.id));
    reorderChildren(freshPoultry, [
      `${DEPT_MEAT}/עוף-טרי/עוף-טרי-איכותי`,
      `${DEPT_MEAT}/עוף-טרי/עוף-טרי-ארוז`,
      `${DEPT_MEAT}/עוף-טרי/הודו-טרי-ארוז`,
      `${DEPT_MEAT}/עוף-טרי/עוף-והודו-ארוז-כשרויות-מיוחדות`,
    ]);
  }

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

  const removedGroupIds = new Set([`${DEPT_MEAT}/מזון-מצונן`]);
  dept.children = dept.children.filter(
    (c) => !isFallbackLeafId(c.id) && !removedGroupIds.has(c.id),
  );
}

function patchBreadDepartment(roots: readonly BackboneNode[], dept: BackboneNode): void {
  const bakery = findChild(dept, `${DEPT_BREAD}/המאפיה-הטריה-אפיה-במקום`);
  if (bakery) {
    bakery.nameHe = 'מאפים טריים';
    bakery.nameEn = 'מאפים טריים';
  }

  const breadGroup = findChild(dept, `${DEPT_BREAD}/לחם-פיתה-לחמניה`);
  if (breadGroup) {
    reorderChildren(breadGroup, [
      `${DEPT_BREAD}/לחם-פיתה-לחמניה/לחמים`,
      `${DEPT_BREAD}/לחם-פיתה-לחמניה/לחמניות`,
      `${DEPT_BREAD}/לחם-פיתה-לחמניה/פיתות`,
      `${DEPT_BREAD}/לחם-פיתה-לחמניה/חלה-לשבת`,
    ]);
  }

  const tortillasTargetId = `${DEPT_BREAD}/מאפה-מלוח/טורטיות`;
  const duplicateTortillasId = `${DEPT_BREAD}/לחם-פיתה-לחמניה/טורטיות`;
  const saltyFood = findChild(dept, `${DEPT_BREAD}/מאפה-מלוח`);
  if (breadGroup && saltyFood) {
    const duplicateTortillas = findChild(breadGroup, duplicateTortillasId);
    if (duplicateTortillas) {
      mergeHintsIntoNode(roots, tortillasTargetId, duplicateTortillas.chainHints);
    }
    breadGroup.children = breadGroup.children.filter((c) => c.id !== duplicateTortillasId);

    const crackers = findChild(saltyFood, `${DEPT_BREAD}/מאפה-מלוח/פריכיות`);
    if (crackers) {
      const nestedTortillas = crackers.children.filter((c) => c.id === tortillasTargetId);
      for (const t of nestedTortillas) {
        mergeHintsIntoNode(roots, tortillasTargetId, t.chainHints);
      }
      crackers.children = crackers.children.filter((c) => c.id !== tortillasTargetId);
    }

    let tortillas = findChild(saltyFood, tortillasTargetId);
    if (!tortillas) {
      tortillas = {
        id: tortillasTargetId,
        nameHe: 'טורטיות',
        nameEn: 'טורטיות',
        parentId: saltyFood.id,
        children: [],
      };
      saltyFood.children.push(tortillas);
    } else {
      tortillas.parentId = saltyFood.id;
    }

    reorderChildren(saltyFood, [
      `${DEPT_BREAD}/מאפה-מלוח/פריכיות`,
      `${DEPT_BREAD}/מאפה-מלוח/טורטיות`,
      `${DEPT_BREAD}/מאפה-מלוח/פתית-לחמית-וצנימים`,
      `${DEPT_BREAD}/מאפה-מלוח/קרקרים`,
    ]);
  }

  if (bakery) {
    reorderChildren(bakery, [
      `${DEPT_BREAD}/המאפיה-הטריה-אפיה-במקום/מאפים-טריים`,
      `${DEPT_BREAD}/המאפיה-הטריה-אפיה-במקום/מאפים-מלוחים-מתוקים`,
      `${DEPT_BREAD}/המאפיה-הטריה-אפיה-במקום/לחמי-מאפייה`,
      `${DEPT_BREAD}/המאפיה-הטריה-אפיה-במקום/בגטים-ולחמניות`,
      `${DEPT_BREAD}/המאפיה-הטריה-אפיה-במקום/סופגניות-ודונאטס`,
    ]);
  }

  const donutsTargetId = `${DEPT_BREAD}/המאפיה-הטריה-אפיה-במקום/סופגניות-ודונאטס`;
  const duplicateDonutsId = `${DEPT_BREAD}/לחם-פיתה-לחמניה/סופגניות-ודונאטס`;
  if (breadGroup) {
    const duplicateDonuts = findChild(breadGroup, duplicateDonutsId);
    if (duplicateDonuts) {
      mergeHintsIntoNode(roots, donutsTargetId, duplicateDonuts.chainHints);
    }
    breadGroup.children = breadGroup.children.filter((c) => c.id !== duplicateDonutsId);
  }

  const stripGeneralUnder = [
    {
      group: `${DEPT_BREAD}/לחם-פיתה-לחמניה`,
      hintTarget: `${DEPT_BREAD}/לחם-פיתה-לחמניה/לחמים`,
    },
    { group: `${DEPT_BREAD}/מאפה-מלוח`, hintTarget: `${DEPT_BREAD}/מאפה-מלוח/פריכיות` },
    {
      group: `${DEPT_BREAD}/המאפיה-הטריה-אפיה-במקום`,
      hintTarget: `${DEPT_BREAD}/המאפיה-הטריה-אפיה-במקום/מאפים-טריים`,
    },
    {
      group: `${DEPT_BREAD}/מצות-ומאפים-לפסח`,
      hintTarget: `${DEPT_BREAD}/מצות-ומאפים-לפסח/מצות`,
    },
  ] as const;
  for (const { group, hintTarget } of stripGeneralUnder) {
    const node = findChild(dept, group);
    if (!node) continue;
    mergeHintsIntoNode(roots, hintTarget, node.chainHints);
    node.children = node.children.filter((c) => !isFallbackLeafId(c.id));
  }

  const chilledFood = findChild(dept, `${DEPT_BREAD}/מזון-מצונן`);
  if (chilledFood) {
    mergeHintsIntoNode(
      roots,
      `${DEPT_BREAD}/מצות-ומאפים-לפסח/מאפה-לפסח-מתוק-מלוח`,
      chilledFood.chainHints,
    );
    const chilledPassover = findChild(
      chilledFood,
      `${DEPT_BREAD}/מזון-מצונן/מאפה-לפסח-מתוק-מלוח`,
    );
    if (chilledPassover) {
      mergeHintsIntoNode(
        roots,
        `${DEPT_BREAD}/מצות-ומאפים-לפסח/מאפה-לפסח-מתוק-מלוח`,
        chilledPassover.chainHints,
      );
    }
  }

  const removedGroupIds = new Set([`${DEPT_BREAD}/מזון-מצונן`]);
  dept.children = dept.children.filter(
    (c) => !isFallbackLeafId(c.id) && !removedGroupIds.has(c.id),
  );
}

function patchLegumesDepartment(roots: readonly BackboneNode[], dept: BackboneNode): void {
  const cereals = findChild(dept, `${DEPT_LEGUMES}/דגנים-וחטיפי-אנרגיה`);
  if (cereals) {
    reorderChildren(cereals, [
      `${DEPT_LEGUMES}/דגנים-וחטיפי-אנרגיה/גרנולה-מוזלי-וקוואקר`,
      `${DEPT_LEGUMES}/דגנים-וחטיפי-אנרגיה/קורנפלקס`,
      `${DEPT_LEGUMES}/דגנים-וחטיפי-אנרגיה/דגני-ילדים`,
      `${DEPT_LEGUMES}/דגנים-וחטיפי-אנרגיה/דגני-מבוגרים`,
      `${DEPT_LEGUMES}/דגנים-וחטיפי-אנרגיה/חטיפי-אנרגיה`,
      `${DEPT_LEGUMES}/דגנים-וחטיפי-אנרגיה/חטיף-דגנים-לילדים`,
      `${DEPT_LEGUMES}/דגנים-וחטיפי-אנרגיה/חיטה-תפוחה-ופצפוצי-אורז`,
    ]);
  }

  const riceGroup = findChild(dept, `${DEPT_LEGUMES}/אורז-וקטניות`);
  const riceId = `${DEPT_LEGUMES}/אורז-וקטניות/אורז`;
  if (riceGroup) {
    const mergeRiceInto = (fromId: string) => {
      const from = findChild(riceGroup, fromId);
      if (from) mergeHintsIntoNode(roots, riceId, from.chainHints);
    };
    mergeRiceInto(`${DEPT_LEGUMES}/אורז-וקטניות/אורז-סיטונאות`);
    mergeRiceInto(`${DEPT_LEGUMES}/אורז-וקטניות/ארוחה-בסיר-אחד`);
    const removedRiceIds = new Set([
      `${DEPT_LEGUMES}/אורז-וקטניות/אורז-סיטונאות`,
      `${DEPT_LEGUMES}/אורז-וקטניות/ארוחה-בסיר-אחד`,
    ]);
    riceGroup.children = riceGroup.children.filter((c) => !removedRiceIds.has(c.id));
    reorderChildren(riceGroup, [riceId, `${DEPT_LEGUMES}/אורז-וקטניות/קטניות`]);
  }

  const pasta = findChild(dept, `${DEPT_LEGUMES}/פסטה-פתיתים-קוסקוס`);
  if (pasta) {
    reorderChildren(pasta, [
      `${DEPT_LEGUMES}/פסטה-פתיתים-קוסקוס/פסטות`,
      `${DEPT_LEGUMES}/פסטה-פתיתים-קוסקוס/פתיתים`,
      `${DEPT_LEGUMES}/פסטה-פתיתים-קוסקוס/נודלס-ואטריות`,
      `${DEPT_LEGUMES}/פסטה-פתיתים-קוסקוס/ניוקי-לזניה-קנלוני`,
      `${DEPT_LEGUMES}/פסטה-פתיתים-קוסקוס/קוסקוס`,
    ]);
  }

  const stripGeneralUnder = [
    {
      group: `${DEPT_LEGUMES}/פסטה-פתיתים-קוסקוס`,
      hintTarget: `${DEPT_LEGUMES}/פסטה-פתיתים-קוסקוס/פסטות`,
    },
    {
      group: `${DEPT_LEGUMES}/דגנים-וחטיפי-אנרגיה`,
      hintTarget: `${DEPT_LEGUMES}/דגנים-וחטיפי-אנרגיה/גרנולה-מוזלי-וקוואקר`,
    },
    { group: `${DEPT_LEGUMES}/אורז-וקטניות`, hintTarget: `${DEPT_LEGUMES}/אורז-וקטניות/אורז` },
  ] as const;
  for (const { group, hintTarget } of stripGeneralUnder) {
    const node = findChild(dept, group);
    if (!node) continue;
    mergeHintsIntoNode(roots, hintTarget, node.chainHints);
    node.children = node.children.filter((c) => !isFallbackLeafId(c.id));
  }

  const legumesSaltyId = `${DEPT_LEGUMES}/מאפה-מלוח`;
  const breadSaltyId = `${DEPT_BREAD}/מאפה-מלוח`;
  const legumesSalty = findChild(dept, legumesSaltyId);
  if (legumesSalty) {
    const breadDept = findNodeById(roots, DEPT_BREAD);
    const breadSalty = breadDept ? findChild(breadDept, breadSaltyId) : undefined;
    if (breadSalty) {
      mergeHintsIntoNode(roots, breadSaltyId, legumesSalty.chainHints);
      for (const child of legumesSalty.children) {
        const suffix = child.id.slice(legumesSaltyId.length);
        mergeHintsIntoNode(roots, `${breadSaltyId}${suffix}`, child.chainHints);
      }
    }
    dept.children = dept.children.filter((c) => c.id !== legumesSaltyId);
  }

  mergeHintsIntoNode(roots, `${DEPT_LEGUMES}/פסטה-פתיתים-קוסקוס/פסטות`, dept.chainHints);
  dept.children = dept.children.filter((c) => !isFallbackLeafId(c.id));
}

function loadAllRulePacks(): RulePackJson[] {
  return [
    readRulePack('dept-פירות-וירקות.json'),
    readRulePack('dept-חלב-ביצים-וסלטים.json'),
    readRulePack('dept-בשר-ודגים.json'),
    readRulePack('dept-לחם-מאפים-והמאפייה-הטריה.json'),
    readRulePack('dept-קטניות-ודגנים.json'),
    readRulePack('dept-שימורים-בישול-ואפיה.json'),
    readRulePack('dept-משקאות.json'),
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

  const breadDept = findNodeById(cloned, DEPT_BREAD);
  if (breadDept) patchBreadDepartment(cloned, breadDept);

  const legumesDept = findNodeById(cloned, DEPT_LEGUMES);
  if (legumesDept) patchLegumesDepartment(cloned, legumesDept);

  const pantryDept = findNodeById(cloned, DEPT_PANTRY);
  if (pantryDept) patchPantryDepartment(cloned, pantryDept);

  const beveragesDept = findNodeById(cloned, DEPT_BEVERAGES);
  if (beveragesDept) patchBeveragesDepartment(cloned, beveragesDept);

  patchRootDepartmentOrder(cloned);

  return cloned;
}

function patchPantryDepartment(roots: readonly BackboneNode[], dept: BackboneNode): void {
  const preservesId = `${DEPT_PANTRY}/שימורים`;
  const fruitPreservesId = `${preservesId}/שימורי-פירות-ולפתנים`;
  const preserves = findChild(dept, preservesId);

  const mergePreservesInto = (fromId: string, toId: string) => {
    if (!preserves) return;
    const from = findChild(preserves, fromId);
    if (from) mergeHintsIntoNode(roots, toId, from.chainHints);
  };

  if (preserves) {
    mergePreservesInto(`${preservesId}/שימורי-טונה-סיטונאות`, `${preservesId}/שימורי-טונה`);
    mergePreservesInto(`${preservesId}/שימורי-ירקות-סיטונאות`, `${preservesId}/שימורי-ירקות`);
    mergePreservesInto(`${preservesId}/שימורי-עגבניות-סיטונאות`, `${preservesId}/שימורי-עגבניות`);
    mergePreservesInto(`${preservesId}/ירקות-כבושים`, `${preservesId}/שימורי-ירקות`);
    mergePreservesInto(`${preservesId}/שימורי-פטריות`, `${preservesId}/שימורי-ירקות`);

    const removedPreserveIds = new Set([
      `${preservesId}/שימורי-טונה-סיטונאות`,
      `${preservesId}/שימורי-ירקות-סיטונאות`,
      `${preservesId}/שימורי-עגבניות-סיטונאות`,
      `${preservesId}/ירקות-כבושים`,
      `${preservesId}/שימורי-פטריות`,
    ]);
    preserves.children = preserves.children.filter(
      (c) => !isFallbackLeafId(c.id) && !removedPreserveIds.has(c.id),
    );

    mergeHintsIntoNode(roots, `${preservesId}/שימורי-עגבניות`, preserves.chainHints);
    preserves.children = preserves.children.filter((c) => !isFallbackLeafId(c.id));

    reorderChildren(preserves, [
      `${preservesId}/שימורי-עגבניות`,
      `${preservesId}/שימורי-זיתים`,
      `${preservesId}/שימורי-מלפפונים`,
      `${preservesId}/שימורי-טונה`,
      `${preservesId}/שימורי-תירס-פטריות`,
      `${preservesId}/שימורי-ירקות`,
      `${preservesId}/שימורי-דגים`,
      fruitPreservesId,
    ]);
  }

  const fruitAtDept = findChild(dept, fruitPreservesId);
  if (fruitAtDept && preserves) {
    dept.children = dept.children.filter((c) => c.id !== fruitPreservesId);
    fruitAtDept.parentId = preservesId;
    preserves.children.push(fruitAtDept);
    reorderChildren(preserves, [
      `${preservesId}/שימורי-עגבניות`,
      `${preservesId}/שימורי-זיתים`,
      `${preservesId}/שימורי-מלפפונים`,
      `${preservesId}/שימורי-טונה`,
      `${preservesId}/שימורי-תירס-פטריות`,
      `${preservesId}/שימורי-ירקות`,
      `${preservesId}/שימורי-דגים`,
      fruitPreservesId,
    ]);
  }

  const saucesId = `${DEPT_PANTRY}/רטבים`;
  const ketchupId = `${saucesId}/קטשופ`;
  const sauces = findChild(dept, saucesId);
  if (sauces) {
    mergeHintsIntoNode(roots, ketchupId, sauces.chainHints);
    sauces.children = sauces.children.filter((c) => !isFallbackLeafId(c.id));
    reorderChildren(sauces, [
      ketchupId,
      `${saucesId}/רטבי-עגבניות`,
      `${saucesId}/מיונז`,
      `${saucesId}/חרדל`,
      `${saucesId}/רוטב-לסלט`,
      `${saucesId}/רוטב-לבישול`,
      `${saucesId}/רוטב-סויה`,
      `${saucesId}/רוטב-צ-ילי`,
    ]);
  }

  const soupsId = `${DEPT_PANTRY}/מרקים-ותבשילים`;
  const soupSeasoningId = `${soupsId}/מרקי-תיבול`;
  const soups = findChild(dept, soupsId);
  if (soups) {
    mergeHintsIntoNode(roots, soupSeasoningId, soups.chainHints);
    soups.children = soups.children.filter((c) => !isFallbackLeafId(c.id));
  }

  const spicesId = `${DEPT_PANTRY}/תבלינים`;
  const sugarId = `${spicesId}/סוכר`;
  const spices = findChild(dept, spicesId);
  if (spices) {
    mergeHintsIntoNode(roots, sugarId, spices.chainHints);
    spices.children = spices.children.filter((c) => !isFallbackLeafId(c.id));
    reorderChildren(spices, [
      sugarId,
      `${spicesId}/מלח`,
      `${spicesId}/פלפל`,
      `${spicesId}/פפריקה`,
      `${spicesId}/תבלינים-בשקית-במיכל`,
      `${spicesId}/תיבולים-למזון`,
      `${spicesId}/תבלינים-במשקל`,
      `${spicesId}/תבלינים-במיכל`,
    ]);
  }

  const spreadsId = `${DEPT_PANTRY}/דבש-ריבה-וממרחים`;
  const jamId = `${spreadsId}/ריבות-וקונפיטורה`;
  const spreads = findChild(dept, spreadsId);
  if (spreads) {
    mergeHintsIntoNode(roots, jamId, spreads.chainHints);
    spreads.children = spreads.children.filter((c) => !isFallbackLeafId(c.id));
  }

  const oilsId = `${DEPT_PANTRY}/שמן-חומץ-ומיץ-לימון`;
  const oliveOilId = `${oilsId}/שמן-זית`;
  const vegOilsId = `${oilsId}/שמנים-צמחיים`;
  const oils = findChild(dept, oilsId);
  if (oils) {
    const bulkOils = findChild(oils, `${oilsId}/שמנים-סיטונאות`);
    if (bulkOils) mergeHintsIntoNode(roots, vegOilsId, bulkOils.chainHints);
    mergeHintsIntoNode(roots, oliveOilId, oils.chainHints);
    oils.children = oils.children.filter(
      (c) => !isFallbackLeafId(c.id) && c.id !== `${oilsId}/שמנים-סיטונאות`,
    );
  }

  const bakingId = `${DEPT_PANTRY}/מוצרי-אפיה`;
  const bakingMixId = `${bakingId}/תערובת-ובסיס-לעוגה-ומאפים`;
  const baking = findChild(dept, bakingId);
  if (baking) {
    mergeHintsIntoNode(roots, bakingMixId, baking.chainHints);
    baking.children = baking.children.filter((c) => !isFallbackLeafId(c.id));
  }

  const flourId = `${DEPT_PANTRY}/קמח-ופירורי-לחם`;
  const flourMealId = `${flourId}/קמח-וסולת`;
  const flour = findChild(dept, flourId);
  if (flour) {
    const bulkFlour = findChild(flour, `${flourId}/קמח-וסולת-סיטונאות`);
    if (bulkFlour) mergeHintsIntoNode(roots, flourMealId, bulkFlour.chainHints);
    mergeHintsIntoNode(roots, flourMealId, flour.chainHints);
    flour.children = flour.children.filter(
      (c) => !isFallbackLeafId(c.id) && c.id !== `${flourId}/קמח-וסולת-סיטונאות`,
    );
  }

  mergeHintsIntoNode(roots, `${preservesId}/שימורי-עגבניות`, dept.chainHints);
  dept.children = dept.children.filter((c) => !isFallbackLeafId(c.id));
}

function patchBeveragesDepartment(roots: readonly BackboneNode[], dept: BackboneNode): void {
  dept.icon = 'CupSoda';

  const stripGeneralUnder = (groupId: string, hintTargetId: string) => {
    const group = findChild(dept, groupId);
    if (!group) return;
    mergeHintsIntoNode(roots, hintTargetId, group.chainHints);
    group.children = group.children.filter((c) => !isFallbackLeafId(c.id));
  };

  const softDrinksId = `${DEPT_BEVERAGES}/משקאות-קלים`;
  const defaultLeafId = `${softDrinksId}/מים-וסודה-בטעמים`;

  stripGeneralUnder(softDrinksId, defaultLeafId);
  stripGeneralUnder(`${DEPT_BEVERAGES}/משקאות-חמים`, `${DEPT_BEVERAGES}/משקאות-חמים/קפה-נמס-אבקה`);
  stripGeneralUnder(`${DEPT_BEVERAGES}/יינות`, `${DEPT_BEVERAGES}/יינות/יינות-לבנים`);
  stripGeneralUnder(
    `${DEPT_BEVERAGES}/אלכוהול-ואנרגיה`,
    `${DEPT_BEVERAGES}/אלכוהול-ואנרגיה/בירה-בירה-שחורה`,
  );
  stripGeneralUnder(`${DEPT_BEVERAGES}/תרכיזים`, `${DEPT_BEVERAGES}/תרכיזים/סירופ-ותרכיזים`);

  const alcoholId = `${DEPT_BEVERAGES}/אלכוהול-ואנרגיה`;
  const singleBeerId = `${alcoholId}/בירה-בודד`;
  const duplicateSpiritsId = `${DEPT_BEVERAGES}/משקאות-חריפים`;
  const duplicateSpirits = findChild(dept, duplicateSpiritsId);
  if (duplicateSpirits) {
    const dupBeer = findChild(duplicateSpirits, `${duplicateSpiritsId}/בירה-בודד`);
    if (dupBeer) mergeHintsIntoNode(roots, singleBeerId, dupBeer.chainHints);
    mergeHintsIntoNode(roots, singleBeerId, duplicateSpirits.chainHints);
    dept.children = dept.children.filter((c) => c.id !== duplicateSpiritsId);
  }

  stripGeneralUnder(
    `${DEPT_BEVERAGES}/משקאות-במארזים`,
    `${DEPT_BEVERAGES}/משקאות-במארזים/משקאות-קלים-במארזים`,
  );
  stripGeneralUnder(`${DEPT_BEVERAGES}/תה-וחליטות`, `${DEPT_BEVERAGES}/תה-וחליטות/תה-ירוק`);

  mergeHintsIntoNode(roots, defaultLeafId, dept.chainHints);
  dept.children = dept.children.filter((c) => !isFallbackLeafId(c.id));
}

/** Top-level dept order + display names not tied to a single department rule pack. */
function patchRootDepartmentOrder(roots: BackboneNode[]): void {
  const breadIdx = roots.findIndex((d) => d.id === DEPT_BREAD);
  const meatIdx = roots.findIndex((d) => d.id === DEPT_MEAT);
  if (breadIdx < 0 || meatIdx < 0) return;
  const [bread] = roots.splice(breadIdx, 1);
  bread.nameHe = 'לחמים ומוצרי מאפה';
  bread.nameEn = 'לחמים ומוצרי מאפה';
  const meatIdxAfter = roots.findIndex((d) => d.id === DEPT_MEAT);
  roots.splice(meatIdxAfter + 1, 0, bread);

  const legumesIdx = roots.findIndex((d) => d.id === DEPT_LEGUMES);
  const breadIdxAfter = roots.findIndex((d) => d.id === DEPT_BREAD);
  if (legumesIdx >= 0 && breadIdxAfter >= 0) {
    const [legumes] = roots.splice(legumesIdx, 1);
    const breadPos = roots.findIndex((d) => d.id === DEPT_BREAD);
    roots.splice(breadPos + 1, 0, legumes);
  }

  const pantryIdx = roots.findIndex((d) => d.id === DEPT_PANTRY);
  const legumesIdxAfter = roots.findIndex((d) => d.id === DEPT_LEGUMES);
  if (pantryIdx >= 0 && legumesIdxAfter >= 0) {
    const [pantry] = roots.splice(pantryIdx, 1);
    pantry.icon = 'CookingPot';
    const legumesPos = roots.findIndex((d) => d.id === DEPT_LEGUMES);
    roots.splice(legumesPos + 1, 0, pantry);
  }

  const beveragesIdx = roots.findIndex((d) => d.id === DEPT_BEVERAGES);
  const pantryIdxAfter = roots.findIndex((d) => d.id === DEPT_PANTRY);
  if (beveragesIdx >= 0 && pantryIdxAfter >= 0) {
    const [beverages] = roots.splice(beveragesIdx, 1);
    const pantryPos = roots.findIndex((d) => d.id === DEPT_PANTRY);
    roots.splice(pantryPos + 1, 0, beverages);
  }
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
