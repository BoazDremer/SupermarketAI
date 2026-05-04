export function formatIlsMinor(minorUnits: number): string {
  return `₪${(minorUnits / 100).toFixed(2)}`;
}
