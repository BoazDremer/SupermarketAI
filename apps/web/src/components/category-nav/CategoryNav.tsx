import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { iconForName } from '@/lib/categories';
import {
  useCategoryTreeQuery,
  type CategoryTreeGroupApi,
} from '@/hooks/use-catalog-api';
import { cn } from '@/lib/utils';

/**
 * Top navigation strip listing every backbone group as an icon button.
 *
 * Clicking a group does two things at once:
 *   - Navigates to `/search?category=<groupId>` so the catalog is filtered by
 *     the whole group (the "All" option for that group).
 *   - Expands a second row underneath that lists the group's leaves so the
 *     user can drill into a more specific subcategory.
 *
 * Which group is "expanded" is derived purely from the URL (the parent of the
 * currently-selected category), so navigation and expansion stay in sync and
 * back/forward through history works as expected.
 */
export function CategoryNav() {
  const { i18n } = useTranslation();
  const isHebrew = i18n.language?.startsWith('he') ?? false;
  const [params] = useSearchParams();
  const selected = params.get('category') ?? '';

  const { data, isLoading } = useCategoryTreeQuery();
  const groups = data?.groups ?? [];

  // Map leaf id → parent group id so we can highlight/expand the right group
  // when a leaf is selected.
  const parentByLeaf = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of groups) for (const l of g.children) m.set(l.id, g.id);
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

  // The expanded group is whichever group is currently selected, or the
  // parent group of the currently-selected leaf.
  const expandedGroupId =
    groups.find((g) => g.id === selected)?.id ?? parentByLeaf.get(selected) ?? null;
  const expandedGroup = expandedGroupId
    ? groups.find((g) => g.id === expandedGroupId)
    : undefined;

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
              parentByLeaf={parentByLeaf}
            />
          ))}
        </div>

        {expandedGroup && (
          <CategoryLeafRow
            group={expandedGroup}
            isHebrew={isHebrew}
            selectedCategoryId={selected}
          />
        )}
      </div>
    </div>
  );
}

type CategoryGroupButtonProps = {
  group: CategoryTreeGroupApi;
  isHebrew: boolean;
  selectedCategoryId: string;
  parentByLeaf: Map<string, string>;
};

function CategoryGroupButton({
  group,
  isHebrew,
  selectedCategoryId,
  parentByLeaf,
}: CategoryGroupButtonProps) {
  const Icon = iconForName(group.icon);
  const label = isHebrew ? group.nameHe : group.nameEn;
  const isSelectedGroup = selectedCategoryId === group.id;
  const selectedLeafBelongsToGroup = parentByLeaf.get(selectedCategoryId) === group.id;
  const isActive = isSelectedGroup || selectedLeafBelongsToGroup;

  return (
    <Link
      to={`/search?category=${encodeURIComponent(group.id)}`}
      aria-label={label}
      aria-current={isSelectedGroup ? 'page' : undefined}
      aria-expanded={isActive}
      aria-controls={`category-leaves-${group.id}`}
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

type CategoryLeafRowProps = {
  group: CategoryTreeGroupApi;
  isHebrew: boolean;
  selectedCategoryId: string;
};

function CategoryLeafRow({
  group,
  isHebrew,
  selectedCategoryId,
}: CategoryLeafRowProps) {
  return (
    <div
      id={`category-leaves-${group.id}`}
      className="flex flex-wrap items-center gap-2 border-t pb-3 pt-2 sm:gap-2.5"
    >
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground sm:text-xs">
        {isHebrew ? group.nameHe : group.nameEn}
      </span>
      <Link
        to={`/search?category=${encodeURIComponent(group.id)}`}
        className={cn(
          'inline-flex items-center rounded-full border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:text-xs',
          selectedCategoryId === group.id &&
            'border-primary/50 bg-primary/10 text-primary',
        )}
      >
        {isHebrew ? 'הכל' : 'All'}
      </Link>
      {group.children.map((leaf) => {
        const active = selectedCategoryId === leaf.id;
        const label = isHebrew ? leaf.nameHe : leaf.nameEn;
        return (
          <Link
            key={leaf.id}
            to={`/search?category=${encodeURIComponent(leaf.id)}`}
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
