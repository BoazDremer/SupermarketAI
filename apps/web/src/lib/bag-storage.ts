const BAG_ID_KEY = 'spc_fixture_bag_id';
const LAST_COMPARE_KEY = 'spc_last_comparison_id';

export function getStoredBagId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(BAG_ID_KEY);
}

export function setStoredBagId(id: string): void {
  window.localStorage.setItem(BAG_ID_KEY, id);
}

export function clearStoredBagId(): void {
  window.localStorage.removeItem(BAG_ID_KEY);
}

export function getLastComparisonId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LAST_COMPARE_KEY);
}

export function setLastComparisonId(id: string): void {
  window.localStorage.setItem(LAST_COMPARE_KEY, id);
}
