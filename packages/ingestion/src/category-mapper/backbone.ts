/**
 * The "common backbone" — a hand-curated 2-level shopper-friendly category
 * tree that both Shufersal and Rami Levy chain categories get mapped onto.
 *
 * Top-level groups roughly mirror the aisles a shopper navigates; leaves are
 * concrete buckets (milk, yogurt, ...) the user can filter by. Icons are
 * Lucide icon names (used by `apps/web/src/lib/categories.ts`).
 *
 * Adding/removing a leaf here is the canonical place to evolve the taxonomy.
 * After changing this file, re-run `pnpm scrape:categories` so aliases get
 * regenerated against the new backbone.
 */

import type { CommonCategoryNode } from '../scrapers/types.js';

type BackboneLeaf = {
  id: string; // e.g. "dairy/milk"
  nameHe: string;
  nameEn: string;
};

type BackboneGroup = {
  id: string; // e.g. "dairy"
  nameHe: string;
  nameEn: string;
  icon: string; // Lucide icon name
  leaves: BackboneLeaf[];
};

export const COMMON_BACKBONE: readonly BackboneGroup[] = [
  {
    id: 'dairy',
    nameHe: 'חלב ומוצרי חלב',
    nameEn: 'Dairy',
    icon: 'Milk',
    leaves: [
      { id: 'dairy/milk', nameHe: 'חלב', nameEn: 'Milk' },
      { id: 'dairy/cheese', nameHe: 'גבינות', nameEn: 'Cheese' },
      { id: 'dairy/yogurt', nameHe: 'יוגורט ומעדנים', nameEn: 'Yogurt & Desserts' },
      { id: 'dairy/eggs', nameHe: 'ביצים', nameEn: 'Eggs' },
      { id: 'dairy/butter-cream', nameHe: 'חמאה ושמנת', nameEn: 'Butter & Cream' },
      { id: 'dairy/plant-based', nameHe: 'חלב צמחי', nameEn: 'Plant-based dairy' },
    ],
  },
  {
    id: 'produce',
    nameHe: 'פירות וירקות',
    nameEn: 'Produce',
    icon: 'Salad',
    leaves: [
      { id: 'produce/vegetables', nameHe: 'ירקות', nameEn: 'Vegetables' },
      { id: 'produce/fruits', nameHe: 'פירות', nameEn: 'Fruits' },
      { id: 'produce/herbs', nameHe: 'עשבי תיבול', nameEn: 'Herbs' },
      { id: 'produce/organic', nameHe: 'אורגני', nameEn: 'Organic produce' },
    ],
  },
  {
    id: 'bakery',
    nameHe: 'מאפיה',
    nameEn: 'Bakery',
    icon: 'Croissant',
    leaves: [
      { id: 'bakery/bread', nameHe: 'לחם', nameEn: 'Bread' },
      { id: 'bakery/pita-challah', nameHe: 'פיתות וחלות', nameEn: 'Pita & Challah' },
      { id: 'bakery/pastries', nameHe: 'מאפים ועוגות', nameEn: 'Pastries & cakes' },
    ],
  },
  {
    id: 'breakfast',
    nameHe: 'ארוחת בוקר',
    nameEn: 'Breakfast',
    icon: 'Wheat',
    leaves: [
      { id: 'breakfast/cereals', nameHe: 'דגני בוקר', nameEn: 'Cereals' },
      { id: 'breakfast/spreads', nameHe: 'ממרחים וריבות', nameEn: 'Spreads & jams' },
      { id: 'breakfast/honey', nameHe: 'דבש וסילאן', nameEn: 'Honey & syrup' },
    ],
  },
  {
    id: 'meat-fish',
    nameHe: 'בשר ודגים',
    nameEn: 'Meat & Fish',
    icon: 'Beef',
    leaves: [
      { id: 'meat-fish/beef', nameHe: 'בקר וטלה', nameEn: 'Beef & Lamb' },
      { id: 'meat-fish/poultry', nameHe: 'עוף והודו', nameEn: 'Poultry' },
      { id: 'meat-fish/fish', nameHe: 'דגים', nameEn: 'Fish' },
      { id: 'meat-fish/deli', nameHe: 'נקניקים וקציצות', nameEn: 'Deli & sausage' },
    ],
  },
  {
    id: 'frozen',
    nameHe: 'קפואים',
    nameEn: 'Frozen',
    icon: 'Snowflake',
    leaves: [
      { id: 'frozen/meals', nameHe: 'ארוחות קפואות', nameEn: 'Frozen meals' },
      { id: 'frozen/ice-cream', nameHe: 'גלידה וקרח', nameEn: 'Ice cream' },
      { id: 'frozen/vegetables', nameHe: 'ירקות קפואים', nameEn: 'Frozen vegetables' },
      { id: 'frozen/fish', nameHe: 'דגים קפואים', nameEn: 'Frozen fish' },
    ],
  },
  {
    id: 'pantry',
    nameHe: 'מזווה ויסודות מטבח',
    nameEn: 'Pantry',
    icon: 'Package',
    leaves: [
      { id: 'pantry/grains', nameHe: 'אורז ופסטה', nameEn: 'Rice & pasta' },
      { id: 'pantry/oils', nameHe: 'שמן וחומץ', nameEn: 'Oils & Vinegar' },
      { id: 'pantry/flour-sugar', nameHe: 'קמח וסוכר', nameEn: 'Flour & sugar' },
      { id: 'pantry/spices', nameHe: 'תבלינים ומלח', nameEn: 'Spices & salt' },
      { id: 'pantry/sauces', nameHe: 'רטבים וקטשופ', nameEn: 'Sauces' },
      { id: 'pantry/canned', nameHe: 'שימורים', nameEn: 'Canned goods' },
      { id: 'pantry/legumes', nameHe: 'קטניות', nameEn: 'Legumes' },
      { id: 'pantry/middle-eastern', nameHe: 'טחינה וחומוס', nameEn: 'Tahini & Hummus' },
    ],
  },
  {
    id: 'snacks',
    nameHe: 'חטיפים וממתקים',
    nameEn: 'Snacks & Sweets',
    icon: 'Cookie',
    leaves: [
      { id: 'snacks/salty', nameHe: 'חטיפים מלוחים', nameEn: 'Salty snacks' },
      { id: 'snacks/chocolate', nameHe: 'שוקולד', nameEn: 'Chocolate' },
      { id: 'snacks/candy', nameHe: 'סוכריות וגומי', nameEn: 'Candy' },
      { id: 'snacks/cookies', nameHe: 'עוגיות וביסקוויטים', nameEn: 'Cookies' },
      { id: 'snacks/dried-fruit', nameHe: 'פירות יבשים ואגוזים', nameEn: 'Dried fruit & nuts' },
    ],
  },
  {
    id: 'beverages',
    nameHe: 'משקאות',
    nameEn: 'Beverages',
    icon: 'CupSoda',
    leaves: [
      { id: 'beverages/water', nameHe: 'מים מינרליים', nameEn: 'Water' },
      { id: 'beverages/soft', nameHe: 'משקאות קלים', nameEn: 'Soft drinks' },
      { id: 'beverages/juice', nameHe: 'מיצים', nameEn: 'Juice' },
      { id: 'beverages/coffee-tea', nameHe: 'קפה ותה', nameEn: 'Coffee & tea' },
      { id: 'beverages/energy', nameHe: 'משקאות אנרגיה', nameEn: 'Energy drinks' },
    ],
  },
  {
    id: 'alcohol',
    nameHe: 'אלכוהול',
    nameEn: 'Alcohol',
    icon: 'Wine',
    leaves: [
      { id: 'alcohol/beer', nameHe: 'בירה', nameEn: 'Beer' },
      { id: 'alcohol/wine', nameHe: 'יין', nameEn: 'Wine' },
      { id: 'alcohol/spirits', nameHe: 'משקאות חריפים', nameEn: 'Spirits' },
    ],
  },
  {
    id: 'baby',
    nameHe: 'תינוקות',
    nameEn: 'Baby',
    icon: 'Baby',
    leaves: [
      { id: 'baby/diapers', nameHe: 'חיתולים', nameEn: 'Diapers' },
      { id: 'baby/formula-food', nameHe: 'פורמולה ומחית', nameEn: 'Formula & baby food' },
      { id: 'baby/wipes', nameHe: 'מגבונים', nameEn: 'Wipes' },
      { id: 'baby/care', nameHe: 'טיפוח ואביזרי תינוקות', nameEn: 'Baby care & accessories' },
    ],
  },
  {
    id: 'household',
    nameHe: 'בית וניקיון',
    nameEn: 'Household',
    icon: 'Home',
    leaves: [
      { id: 'household/cleaning', nameHe: 'ניקיון', nameEn: 'Cleaning' },
      { id: 'household/paper', nameHe: 'נייר וטישו', nameEn: 'Paper & tissues' },
      { id: 'household/laundry', nameHe: 'כביסה', nameEn: 'Laundry' },
      { id: 'household/kitchen', nameHe: 'כלי בית ומטבח', nameEn: 'Kitchen & home' },
    ],
  },
  {
    id: 'personal-care',
    nameHe: 'טיפוח ויופי',
    nameEn: 'Personal Care',
    icon: 'Sparkles',
    leaves: [
      { id: 'personal-care/toiletries', nameHe: 'סבון ושמפו', nameEn: 'Toiletries' },
      { id: 'personal-care/cosmetics', nameHe: 'איפור וקוסמטיקה', nameEn: 'Cosmetics' },
      { id: 'personal-care/oral', nameHe: 'טיפוח שיניים', nameEn: 'Oral care' },
      { id: 'personal-care/shaving', nameHe: 'גילוח והסרת שיער', nameEn: 'Shaving' },
      { id: 'personal-care/feminine', nameHe: 'מוצרי היגיינה לנשים', nameEn: 'Feminine care' },
    ],
  },
  {
    id: 'pet',
    nameHe: 'חיות מחמד',
    nameEn: 'Pet',
    icon: 'Dog',
    leaves: [
      { id: 'pet/dog', nameHe: 'כלבים', nameEn: 'Dog food & care' },
      { id: 'pet/cat', nameHe: 'חתולים', nameEn: 'Cat food & care' },
    ],
  },
];

/** Flat ordered list of all leaf ids for downstream lookup. */
export const COMMON_LEAVES: ReadonlyArray<{
  id: string;
  nameHe: string;
  nameEn: string;
  groupId: string;
}> = COMMON_BACKBONE.flatMap((g) =>
  g.leaves.map((l) => ({
    id: l.id,
    nameHe: l.nameHe,
    nameEn: l.nameEn,
    groupId: g.id,
  })),
);

/** Map from id -> { nameHe, nameEn } for both groups and leaves. */
export const COMMON_BY_ID = new Map<string, { nameHe: string; nameEn: string; parentId?: string }>(
  COMMON_BACKBONE.flatMap((g) => [
    [g.id, { nameHe: g.nameHe, nameEn: g.nameEn }] as const,
    ...g.leaves.map(
      (l) => [l.id, { nameHe: l.nameHe, nameEn: l.nameEn, parentId: g.id }] as const,
    ),
  ]),
);

/** Convert backbone to the public CommonCategoryNode tree shape. */
export function backboneAsTree(): CommonCategoryNode[] {
  return COMMON_BACKBONE.map((g) => ({
    id: g.id,
    nameHe: g.nameHe,
    nameEn: g.nameEn,
    icon: g.icon,
    children: g.leaves.map((l) => ({
      id: l.id,
      nameHe: l.nameHe,
      nameEn: l.nameEn,
      parentId: g.id,
      children: [],
    })),
  }));
}
