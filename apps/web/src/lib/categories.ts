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
  Boxes,
  Cigarette,
  Cookie,
  CookingPot,
  Croissant,
  CupSoda,
  Dog,
  GlassWater,
  Home,
  Leaf,
  Milk,
  MoreHorizontal,
  Package,
  Pill,
  Plug,
  Salad,
  Snowflake,
  Sparkles,
  SprayCan,
  Tag,
  ToyBrick,
  TreePine,
  Wheat,
  Wine,
} from 'lucide-react';

const ICON_BY_NAME: Record<string, LucideIcon> = {
  Apple,
  Baby,
  Beef,
  Boxes,
  Cigarette,
  Cookie,
  CookingPot,
  Croissant,
  CupSoda,
  Dog,
  GlassWater,
  Home,
  Leaf,
  Milk,
  MoreHorizontal,
  Package,
  Pill,
  Plug,
  Salad,
  Snowflake,
  Sparkles,
  SprayCan,
  Tag,
  ToyBrick,
  TreePine,
  Wheat,
  Wine,
};

export function iconForName(name: string | null | undefined): LucideIcon {
  if (!name) return Tag;
  return ICON_BY_NAME[name] ?? Tag;
}
