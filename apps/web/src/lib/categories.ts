/**
 * Category icon registry for the front-end.
 *
 * The category tree itself is loaded dynamically from `GET /categories/tree`
 * (see `useCategoryTreeQuery`). The API returns a Lucide icon name string
 * per top-level group; this file maps that string to a real component.
 *
 * If the icon name is unknown (or null) we fall back to `Tag`.
 */
import type { LucideIcon } from 'lucide-react';
import {
  Apple,
  Baby,
  Beef,
  Cookie,
  Croissant,
  CupSoda,
  Dog,
  Home,
  Milk,
  Package,
  Salad,
  Snowflake,
  Sparkles,
  Tag,
  Wheat,
  Wine,
} from 'lucide-react';

const ICON_BY_NAME: Record<string, LucideIcon> = {
  Apple,
  Baby,
  Beef,
  Cookie,
  Croissant,
  CupSoda,
  Dog,
  Home,
  Milk,
  Package,
  Salad,
  Snowflake,
  Sparkles,
  Wheat,
  Wine,
};

export function iconForName(name: string | null | undefined): LucideIcon {
  if (!name) return Tag;
  return ICON_BY_NAME[name] ?? Tag;
}
