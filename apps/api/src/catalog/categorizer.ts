/**
 * Heuristic categorizer for ingested products.
 *
 * Real transparency feeds do not include a stable category, so we map
 * Hebrew/English keywords found in product names/brands to the catalog
 * category keys used by the navigation UI.
 *
 * The keys here MUST match `apps/web/src/lib/categories.ts`.
 */
export type CategoryKey =
  | 'dairy'
  | 'produce'
  | 'pantry'
  | 'beverages'
  | 'breakfast'
  | 'bakery'
  | 'meat'
  | 'baby';

type Pattern = { key: CategoryKey; tokens: readonly RegExp[] };

const PATTERNS: readonly Pattern[] = [
  {
    key: 'dairy',
    tokens: [
      /\bחלב\b|גבינה|יוגורט|חמאה|קוטג|שמנת|לבן|מעדן|דניאלה|שוקו|אקטימל|דנונה|ביצים|ביצה/u,
      /\bmilk\b|cheese|yog(h)?urt|butter|cream|cottage|sour cream|eggs?\b|kefir/i,
    ],
  },
  {
    key: 'produce',
    tokens: [
      /עגבני|מלפפון|בצל|תפו"א|תפוח אדמה|תפוז|בננה|פיר|ירק|חס|פלפל|גזר|לימון|אבוקדו|תות|ענבים|אבטיח|מלון|כרוב|ברוקולי|קישוא|חציל/u,
      /\b(tomato|cucumber|onion|potato|apple|banana|fruit|vegetable|lettuce|pepper|carrot|lemon|avocado|strawberry|grape|watermelon|melon|cabbage|broccoli|zucchini|eggplant)\b/i,
    ],
  },
  {
    key: 'meat',
    tokens: [
      /בשר|עוף|הודו|כבש|בקר|המבורגר|נקני|סלמון|טונה|דג(?!ל)|פילה|שניצל|קציצ/u,
      /\b(meat|beef|chicken|turkey|lamb|pork|burger|sausage|salmon|tuna|fish|fillet|schnitzel|steak|bacon|hot dog)\b/i,
    ],
  },
  {
    key: 'bakery',
    tokens: [
      /לחם|לחמני|פיתה|חלה|בייגל|קרואסון|עוגה|עוגי|בורקס|מאפה|טוסט/u,
      /\b(bread|loaf|pita|challah|bagel|croissant|cake|cookie|pastry|toast|rolls?)\b/i,
    ],
  },
  {
    key: 'beverages',
    tokens: [
      /מים|משק|מיץ|קולה|פפסי|ספרייט|תה|קפה|בירה|יין|וודקה|סודה|נביעות|תפוזינה|ספרינג/u,
      /\b(water|soda|juice|cola|pepsi|sprite|tea|coffee|beer|wine|vodka|drink|spring water|sparkling)\b/i,
    ],
  },
  {
    key: 'breakfast',
    tokens: [
      /קורנפלקס|דגני בוקר|גרנולה|שיבולת|קוואקר|דבש|ריבה|ממרח|נוטלה|חמוצים|פתיתים/u,
      /\b(cornflakes|cereal|granola|oats?|oatmeal|honey|jam|spread|nutella|muesli)\b/i,
    ],
  },
  {
    key: 'baby',
    tokens: [
      /חיתול|תינוק|מטרנה|סימילאק|מגבונים|מחית|פורמולה/u,
      /\b(diaper|baby|infant|wipes|formula|puree|toddler)\b/i,
    ],
  },
  {
    key: 'pantry',
    tokens: [
      /אורז|פסטה|שמן|קמח|סוכר|מלח|פלפל|תבלין|רוטב|קטשופ|מיונז|חרדל|חומץ|שימור|טחינה|חומוס|שעועית|עדשים|קוסקוס/u,
      /\b(rice|pasta|oil|flour|sugar|salt|spice|sauce|ketchup|mayonnaise|mustard|vinegar|canned|tahini|hummus|beans?|lentils?|couscous|noodle)\b/i,
    ],
  },
];

/** Returns the best-fit category key for the given Hebrew/English strings, or undefined. */
export function inferCategoryKey(
  ...candidates: readonly (string | null | undefined)[]
): CategoryKey | undefined {
  const haystack = candidates
    .map((s) => (s ?? '').trim())
    .filter((s) => s.length > 0)
    .join(' ');
  if (!haystack) return undefined;
  for (const { key, tokens } of PATTERNS) {
    for (const re of tokens) {
      if (re.test(haystack)) return key;
    }
  }
  return undefined;
}

/**
 * Builds a Prisma `where` OR fragment that loosely matches a category by
 * scanning name fields with `contains` queries (case-insensitive).
 *
 * We extract literal-ish keywords from the regex patterns (ASCII letters or
 * Hebrew runs) and emit them as `contains` conditions across `displayName`
 * and `displayNameHe`. This lets PostgreSQL prune the search space when the
 * user picks a category from the navigation.
 */
export function categoryKeywords(key: CategoryKey): string[] {
  const map: Record<CategoryKey, string[]> = {
    dairy: [
      'חלב',
      'גבינה',
      'יוגורט',
      'חמאה',
      'קוטג',
      'שמנת',
      'מעדן',
      'דניאלה',
      'שוקו',
      'אקטימל',
      'דנונה',
      'ביצי',
      'milk',
      'cheese',
      'yogurt',
      'yoghurt',
      'butter',
      'cream',
      'cottage',
      'eggs',
    ],
    produce: [
      'עגבני',
      'מלפפון',
      'בצל',
      'תפוח',
      'בננה',
      'פיר',
      'ירק',
      'חסה',
      'פלפל',
      'גזר',
      'לימון',
      'אבוקדו',
      'תות',
      'ענב',
      'אבטיח',
      'מלון',
      'כרוב',
      'ברוקולי',
      'קישוא',
      'חציל',
      'tomato',
      'cucumber',
      'onion',
      'potato',
      'apple',
      'banana',
      'fruit',
      'vegetable',
      'lettuce',
      'pepper',
      'carrot',
      'lemon',
      'avocado',
    ],
    meat: [
      'בשר',
      'עוף',
      'הודו',
      'כבש',
      'בקר',
      'נקני',
      'סלמון',
      'טונה',
      'פילה',
      'שניצל',
      'קציצ',
      'meat',
      'beef',
      'chicken',
      'turkey',
      'lamb',
      'pork',
      'burger',
      'sausage',
      'salmon',
      'tuna',
      'fish',
      'fillet',
      'schnitzel',
      'steak',
      'bacon',
    ],
    bakery: [
      'לחם',
      'לחמני',
      'פיתה',
      'חלה',
      'בייגל',
      'קרואסון',
      'עוגה',
      'עוגי',
      'בורקס',
      'מאפה',
      'טוסט',
      'bread',
      'loaf',
      'pita',
      'challah',
      'bagel',
      'croissant',
      'cake',
      'cookie',
      'pastry',
      'toast',
    ],
    beverages: [
      'מים',
      'משק',
      'מיץ',
      'קולה',
      'פפסי',
      'ספרייט',
      'תה',
      'קפה',
      'בירה',
      'יין',
      'וודקה',
      'סודה',
      'water',
      'soda',
      'juice',
      'cola',
      'pepsi',
      'sprite',
      'tea',
      'coffee',
      'beer',
      'wine',
      'vodka',
    ],
    breakfast: [
      'קורנפלקס',
      'דגני בוקר',
      'גרנולה',
      'שיבולת',
      'קוואקר',
      'דבש',
      'ריבה',
      'ממרח',
      'נוטלה',
      'cornflakes',
      'cereal',
      'granola',
      'oats',
      'oatmeal',
      'honey',
      'jam',
      'spread',
      'nutella',
      'muesli',
    ],
    baby: [
      'חיתול',
      'תינוק',
      'מטרנה',
      'סימילאק',
      'מגבונים',
      'מחית',
      'פורמולה',
      'diaper',
      'baby',
      'infant',
      'wipes',
      'formula',
      'puree',
    ],
    pantry: [
      'אורז',
      'פסטה',
      'שמן',
      'קמח',
      'סוכר',
      'מלח',
      'תבלין',
      'רוטב',
      'קטשופ',
      'מיונז',
      'חרדל',
      'חומץ',
      'טחינה',
      'חומוס',
      'שעועית',
      'עדשים',
      'קוסקוס',
      'rice',
      'pasta',
      'oil',
      'flour',
      'sugar',
      'salt',
      'spice',
      'sauce',
      'ketchup',
      'mayonnaise',
      'mustard',
      'vinegar',
      'tahini',
      'hummus',
      'beans',
      'lentils',
      'couscous',
      'noodle',
    ],
  };
  return map[key];
}

/** Deterministic 0–359 hue derived from any string id. */
export function hueForId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) % 360;
  }
  return Math.abs(h);
}
