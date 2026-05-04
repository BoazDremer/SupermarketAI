import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type CategoryTreeLeaf = {
  id: string;
  nameHe: string;
  nameEn: string;
  parentId: string;
};

export type CategoryTreeGroup = {
  id: string;
  nameHe: string;
  nameEn: string;
  icon: string | null;
  children: CategoryTreeLeaf[];
};

export type CategoryTreeResponse = {
  groups: CategoryTreeGroup[];
  /** ISO timestamp of the most recent alias-table update (for cache busting). */
  lastUpdatedAt: string | null;
};

/**
 * Hebrew tokens that carry no semantic weight on their own but commonly
 * appear in category names — descriptors ("טרי", "קפוא"), generic nouns
 * ("מוצרי", "מחלקת"), connectives, English glue, and punctuation. Skipped
 * when emitting sub-tokens for search-filter expansion.
 */
const TOKEN_STOP_WORDS = new Set<string>([
  // Generic category nouns
  'מוצרי',
  'מוצר',
  'מחלקת',
  'מחלקה',
  'ועוד',
  'אחר',
  'אחרים',
  'מבצע',
  'מבצעים',
  // Generic descriptors that appear across many product lines
  'טרי',
  'טריים',
  'קפוא',
  'קפואים',
  'מצונן',
  'מצוננים',
  'טבעי',
  'טבעיים',
  'ישראלי',
  'ישראלית',
  'חי',
  'חיים',
  'פרוס',
  'פרוסים',
  'ארוז',
  'ארוזים',
  'מהיר',
  'קל',
  'קלים',
  'בריאות',
  'דיאט',
  // English glue
  'and',
  'or',
  'of',
  'the',
  'fresh',
  'frozen',
  '&',
  '-',
  '|',
]);

const HE_PREFIX_LETTERS = ['ו', 'ב', 'מ', 'ש', 'ל', 'ה', 'כ'];

/**
 * Hebrew has five letters with distinct word-final ("sofit") forms. When we
 * chop a suffix off a plural, the new last letter must use its sofit form
 * (e.g. plural "שמנים" → singular "שמן", with נ→ן at the new end of word).
 */
const HE_FINAL_FORM: Readonly<Record<string, string>> = {
  כ: 'ך',
  מ: 'ם',
  נ: 'ן',
  פ: 'ף',
  צ: 'ץ',
};
function withFinalForm(stem: string): string {
  if (stem.length === 0) return stem;
  const last = stem[stem.length - 1]!;
  const finalForm = HE_FINAL_FORM[last];
  return finalForm ? stem.slice(0, -1) + finalForm : stem;
}

/**
 * Emit additional morphological variants for a Hebrew noun so word-boundary
 * matching catches both forms (e.g. "גבינות" → also "גבינה",
 * "שמנים" → also "שמן"). Heuristic and may produce nonsense for some
 * inputs; that's fine — harmless extra candidates that simply won't match.
 */
function morphVariants(token: string): string[] {
  const out: string[] = [];
  if (token.endsWith('ות') && token.length >= 5) {
    const stem = token.slice(0, -2);
    out.push(stem + 'ה'); // plural feminine → singular (keep middle form)
    out.push(withFinalForm(stem)); // bare stem with sofit at the new end
  }
  if (token.endsWith('ים') && token.length >= 5) {
    const stem = token.slice(0, -2);
    out.push(withFinalForm(stem)); // plural masculine → singular w/ sofit
  }
  if (token.endsWith('ת') && token.length >= 4) {
    const stem = token.slice(0, -1);
    out.push(stem + 'ה'); // construct → absolute (keep middle form)
  }
  return out;
}

/** Splits a Hebrew/English category phrase into searchable single-word tokens. */
function tokenizeForSearch(phrase: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of phrase.split(/[\s,;:|/()\\.]+/u)) {
    if (!raw) continue;
    let tok = raw.trim().replace(/^['"׳״]+|['"׳״]+$/gu, '');
    if (tok.length < 3) continue;
    // Strip a single Hebrew connective prefix when the resulting word is
    // still long enough (e.g. "ומעדנים" → "מעדנים", "ותה" → "תה").
    if (HE_PREFIX_LETTERS.includes(tok[0]!) && tok.length >= 4) {
      const stripped = tok.slice(1);
      if (stripped.length >= 3) tok = stripped;
    }
    if (TOKEN_STOP_WORDS.has(tok.toLowerCase())) continue;
    if (!seen.has(tok)) {
      seen.add(tok);
      out.push(tok);
    }
    for (const v of morphVariants(tok)) {
      if (v.length >= 3 && !seen.has(v) && !TOKEN_STOP_WORDS.has(v.toLowerCase())) {
        seen.add(v);
        out.push(v);
      }
    }
  }
  return out;
}

/**
 * DB-backed category service that powers:
 *   - GET /categories/tree         (used by the web nav)
 *   - keyword expansion for product search filtering by category id
 *
 * Falls back gracefully if the DB tables haven't been seeded yet (e.g. before
 * the first `pnpm scrape:categories` run): tree is empty, keyword filter
 * returns no synonyms, and search by category yields the unfiltered set.
 */
@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // -------- Tree --------

  async getTree(): Promise<CategoryTreeResponse> {
    const all = await this.prisma.client.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const byId = new Map<string, CategoryTreeGroup | CategoryTreeLeaf>();
    const groups: CategoryTreeGroup[] = [];

    for (const c of all) {
      if (!c.isLeaf) {
        const g: CategoryTreeGroup = {
          id: c.id,
          nameHe: c.nameHe,
          nameEn: c.nameEn,
          icon: c.icon,
          children: [],
        };
        byId.set(c.id, g);
        groups.push(g);
      }
    }
    for (const c of all) {
      if (!c.isLeaf) continue;
      if (!c.parentId) continue;
      const parent = byId.get(c.parentId);
      if (!parent || !('children' in parent)) continue;
      parent.children.push({
        id: c.id,
        nameHe: c.nameHe,
        nameEn: c.nameEn,
        parentId: c.parentId,
      });
    }

    const latestAlias = await this.prisma.client.retailerCategoryAlias.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    return { groups, lastUpdatedAt: latestAlias?.updatedAt.toISOString() ?? null };
  }

  // -------- Filter expansion --------

  /**
   * For a backbone category id (group like "dairy" or leaf like "dairy/milk")
   * returns the union of Hebrew chain category names that the matcher mapped
   * to it, plus the leaf's own canonical Hebrew name. The caller pairs each
   * keyword with word-boundary matching at the SQL layer to avoid noise from
   * Hebrew compound words (e.g. "חלב"→"חלבון"), so short single-word tokens
   * are kept here.
   */
  async getKeywordsForCategoryId(categoryId: string): Promise<string[]> {
    const category = await this.prisma.client.category.findUnique({
      where: { id: categoryId },
      select: { id: true, isLeaf: true, nameHe: true },
    });
    if (!category) return [];

    const ids: string[] = [category.id];
    if (!category.isLeaf) {
      const leaves = await this.prisma.client.category.findMany({
        where: { parentId: category.id },
        select: { id: true, nameHe: true },
      });
      for (const l of leaves) ids.push(l.id);
    }

    const aliases = await this.prisma.client.retailerCategoryAlias.findMany({
      where: { categoryId: { in: ids } },
      select: { chainCategoryName: true },
    });

    // Note: we deliberately skip `matchedSynonym` here — it is a stem/prefix
    // (e.g. "גבינ") used by the offline matcher to score chain→backbone
    // mappings, but it isn't a complete Hebrew word and therefore cannot be
    // safely word-boundary matched against product names.
    const set = new Set<string>();
    const addWithTokens = (raw: string | null | undefined): void => {
      if (!raw) return;
      const cleaned = raw.trim();
      if (cleaned.length >= 2) set.add(cleaned);
      // Multi-word backbone names ("יוגורט ומעדנים", "קפה ותה") never appear
      // verbatim in product titles, so split them into tokens that we can
      // word-boundary match individually. Hebrew connectives ("ו", "ב",
      // "מ") attach to the next word as a 1-letter prefix; strip them.
      for (const tok of tokenizeForSearch(cleaned)) set.add(tok);
    };
    addWithTokens(category.nameHe);
    if (!category.isLeaf) {
      const leafNames = await this.prisma.client.category.findMany({
        where: { parentId: category.id },
        select: { nameHe: true },
      });
      for (const l of leafNames) addWithTokens(l.nameHe);
    }
    for (const a of aliases) addWithTokens(a.chainCategoryName);

    return [...set].map((s) => s.trim()).filter((s) => s.length >= 2);
  }

  /** True if a category id exists in the DB. */
  async exists(categoryId: string): Promise<boolean> {
    const found = await this.prisma.client.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    return Boolean(found);
  }

  /** Fetch the minimal record needed for routing search queries by id. */
  async findById(
    categoryId: string,
  ): Promise<{ id: string; isLeaf: boolean } | undefined> {
    const found = await this.prisma.client.category.findUnique({
      where: { id: categoryId },
      select: { id: true, isLeaf: true },
    });
    return found ?? undefined;
  }
}
