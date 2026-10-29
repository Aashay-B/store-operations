import type { StockLocation, StoreEntry } from "./types";

export type LotLocation = StockLocation | "unspecified";
export type Lot = {
  key: string; item_number: string; description: string; aisle: string; department: string;
  location: LotLocation; best_before: string; on_hand: number; counted_at: string; days: number;
};
export type RotationIssue = { item_number: string; description: string; shelf: Lot; bin: Lot; gap: number };
export type WeekBucket = { start: Date; label: string } & Record<LotLocation, number> & { total: number };

export const LOCATIONS: { key: LotLocation; label: string }[] = [
  { key: "shelf", label: "Shelf" },
  { key: "bin", label: "Bin" },
  { key: "unspecified", label: "Not recorded" },
];
export const locationLabel = (location: LotLocation) => LOCATIONS.find((l) => l.key === location)!.label;
export const NO_DEPARTMENT = "No department";

// Dates are plain YYYY-MM-DD values, so they're read as local dates rather than UTC midnight.
export const parseDate = (date: string) => { const [y, m, d] = date.split("-").map(Number); return new Date(y, m - 1, d); };
export const toDateInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / 86400000);

// Each inventory count records what was on hand for one batch (item + shelf/bin + best-before date) at that
// moment, so a batch's stock as of a date is its most recent count on or before that date. Batches last
// counted at zero have been used up.
export function currentLots(entries: StoreEntry[], asOf: string): Lot[] {
  const asOfDate = parseDate(asOf);
  const cutoff = new Date(asOfDate); cutoff.setDate(cutoff.getDate() + 1);
  const latest = new Map<string, StoreEntry>();
  for (const entry of entries) {
    if (entry.kind !== "inventory_cycle" || !entry.best_before || new Date(entry.created_at) >= cutoff) continue;
    const key = `${entry.item_number}|${entry.location ?? "unspecified"}|${entry.best_before}`;
    const previous = latest.get(key);
    if (!previous || previous.created_at < entry.created_at) latest.set(key, entry);
  }
  return [...latest.entries()]
    .filter(([, entry]) => (entry.on_hand ?? 0) > 0)
    .map(([key, entry]) => ({
      key, item_number: entry.item_number, description: entry.description, aisle: entry.aisle,
      department: entry.department || NO_DEPARTMENT, location: entry.location ?? "unspecified",
      best_before: entry.best_before!, on_hand: entry.on_hand!, counted_at: entry.created_at,
      days: daysBetween(asOfDate, parseDate(entry.best_before!)),
    }));
}

// Stock is rotated wrongly when the back-room bin holds an older batch than the sales floor.
export function rotationIssues(lots: Lot[]): RotationIssue[] {
  const soonest = new Map<string, Partial<Record<StockLocation, Lot>>>();
  for (const lot of lots) {
    if (lot.location === "unspecified") continue;
    const item = soonest.get(lot.item_number) ?? {};
    const current = item[lot.location];
    if (!current || lot.best_before < current.best_before) item[lot.location] = lot;
    soonest.set(lot.item_number, item);
  }
  return [...soonest.values()]
    .filter((item): item is Record<StockLocation, Lot> => !!item.shelf && !!item.bin && item.bin.best_before < item.shelf.best_before)
    .map(({ shelf, bin }) => ({ item_number: shelf.item_number, description: shelf.description, shelf, bin, gap: shelf.days - bin.days }))
    .sort((a, b) => b.gap - a.gap);
}

export function weeklyBuckets(lots: Lot[], asOf: string, weeks: number, measure: (lot: Lot) => number = (lot) => lot.on_hand): WeekBucket[] {
  const start = parseDate(asOf);
  const buckets: WeekBucket[] = Array.from({ length: weeks }, (_, i) => {
    const weekStart = new Date(start); weekStart.setDate(start.getDate() + i * 7);
    return { start: weekStart, label: weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }), shelf: 0, bin: 0, unspecified: 0, total: 0 };
  });
  for (const lot of lots) {
    const bucket = buckets[Math.floor(lot.days / 7)];
    if (lot.days < 0 || !bucket) continue;
    const amount = measure(lot);
    bucket[lot.location] += amount; bucket.total += amount;
  }
  return buckets;
}

export const sumUnits = (lots: Lot[]) => lots.reduce((n, lot) => n + lot.on_hand, 0);
