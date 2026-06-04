import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { iconForName } from '@/lib/categories';
import {
  useCategoryTreeQuery,
  type CategoryTreeNodeApi,
} from '@/hooks/use-catalog-api';
import { cn } from '@/lib/utils';

/**
 * Top navigation strip listing every backbone department as an icon button.
 *
 * The new 3-depth tree means a department may contain intermediate categories
 * that themselves have sub-categories. We render up to three rows:
 *
 *   - Row 1 — departments (icon buttons)
 *   - Row 2 — direct children of the active department (always shown when a
 *     department is in the active ancestor chain)
 *   - Row 3 — direct children of the active category (shown when a depth-1
 *     category that has sub-categories is part of the active ancestor chain)
 *
 * "Active ancestor chain" = the selected node and every ancestor up to the
 * root. Selecting any chip in any row drills the same URL parameter so
 * back/forward stays in sync.
 */
export function CategoryNav() {
  const { i18n } = useTranslation();
  const isHebrew = i18n.language?.startsWith('he') ?? false;
  const [params] = useSearchParams();
  const selected = params.get('category') ?? '';

  const { data, isLoading } = useCategoryTreeQuery();
  const groups = data?.groups ?? [];

  // Recursive index: id -> { node, ancestors[] (root → parent) }
  const index = useMemo(() => {
    const m = new Map<string, { node: CategoryTreeNodeApi; ancestors: CategoryTreeNodeApi[] }>();
    function walk(node: CategoryTreeNodeApi, ancestors: CategoryTreeNodeApi[]): void {
      m.set(node.id, { node, ancestors });
      for (const c of node.children) walk(c, [...ancestors, node]);
    }
    for (const g of groups) walk(g, []);
    return m;
  }, [groups]);

  if (isLoading) {
    return (
      <div className="border-b bg-card/90">
        <div className="mx-auto flex max-w-6xl items-stretch gap-2 overflow-x-auto px-3 py-3 sm:gap-3 sm:px-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-[68px] w-20 shrink-0 animate-pulse rounded-lg border bg-muted/30 sm:w-24"
            />
          ))}
        </div>
      </div>
    );
  }
  if (groups.length === 0) return null;

  // Walk the selected node and its ancestors. We need the department (root)
  // and any intermediate category to decide which rows to render.
  const selectedEntry = index.get(selected);
  const chain: CategoryTreeNodeApi[] = selectedEntry
    ? [...selectedEntry.ancestors, selectedEntry.node]
    : [];
  const activeDept = chain[0];
  const activeCategory = chain[1]; // depth-1 (category) if the chain has one
  const showSubRow =
    activeCategory !== undefined && activeCategory.children.length > 0;

  return (
    <div className="border-b bg-card/90">
      <div className="mx-auto max-w-6xl px-3 sm:px-4">
        <div className="flex items-stretch gap-2 overflow-x-auto py-3 sm:gap-3">
          {groups.map((g) => (
            <CategoryGroupButton
              key={g.id}
              group={g}
              isHebrew={isHebrew}
              selectedCategoryId={selected}
              activeDeptId={activeDept?.id ?? null}
            />
          ))}
        </div>

        {activeDept && (
          <CategoryChipRow
            id={`category-children-${activeDept.id}`}
            parent={activeDept}
            isHebrew={isHebrew}
            selectedCategoryId={selected}
          />
        )}

        {showSubRow && activeCategory && (
          <CategoryChipRow
            id={`category-children-${activeCategory.id}`}
            parent={activeCategory}
            isHebrew={isHebrew}
            selectedCategoryId={selected}
            indent
          />
        )}
      </div>
    </div>
  );
}

type CategoryGroupButtonProps = {
  group: CategoryTreeNodeApi;
  isHebrew: boolean;
  selectedCategoryId: string;
  activeDeptId: string | null;
};

function CategoryGroupButton({
  group,
  isHebrew,
  selectedCategoryId,
  activeDeptId,
}: CategoryGroupButtonProps) {
  const Icon = iconForName(group.icon);
  const label = isHebrew ? group.nameHe : group.nameEn;
  const isSelectedGroup = selectedCategoryId === group.id;
  const isActive = activeDeptId === group.id;

  return (
    <Link
      to={`/search?category=${encodeURIComponent(group.id)}`}
      aria-label={label}
      aria-current={isSelectedGroup ? 'page' : undefined}
      aria-expanded={isActive}
      aria-controls={`category-children-${group.id}`}
      title={label}
      className={cn(
        'group flex w-20 shrink-0 flex-col items-center justify-start gap-1.5 rounded-lg border bg-background px-2 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:w-24 sm:py-3',
        isActive && 'border-primary/50 bg-primary/10 text-primary',
      )}
    >
      <Icon className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
      <span className="text-center text-[11px] font-medium leading-tight sm:text-xs">
        {label}
      </span>
    </Link>
  );
}

type CategoryChipRowProps = {
  id: string;
  parent: CategoryTreeNodeApi;
  isHebrew: boolean;
  selectedCategoryId: string;
  /** When true, indents the row slightly to suggest a sub-tier. */
  indent?: boolean;
};

function CategoryChipRow({
  id,
  parent,
  isHebrew,
  selectedCategoryId,
  indent,
}: CategoryChipRowProps) {
  if (parent.children.length === 0) return null;
  return (
    <div
      id={id}
      className={cn(
        'flex flex-wrap items-center gap-2 border-t pb-3 pt-2 sm:gap-2.5',
        indent && 'pl-3 sm:pl-6',
      )}
    >
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground sm:text-xs">
        {isHebrew ? parent.nameHe : parent.nameEn}
      </span>
      <Link
        to={`/search?category=${encodeURIComponent(parent.id)}`}
        className={cn(
          'inline-flex items-center rounded-full border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:text-xs',
          selectedCategoryId === parent.id &&
            'border-primary/50 bg-primary/10 text-primary',
        )}
      >
        {isHebrew ? 'הכל' : 'All'}
      </Link>
      {parent.children.map((child) => {
        const active = selectedCategoryId === child.id;
        const label = isHebrew ? child.nameHe : child.nameEn;
        return (
          <Link
            key={child.id}
            to={`/search?category=${encodeURIComponent(child.id)}`}
            className={cn(
              'inline-flex items-center rounded-full border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:text-xs',
              active && 'border-primary/50 bg-primary/10 text-primary',
            )}
            aria-current={active ? 'page' : undefined}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
