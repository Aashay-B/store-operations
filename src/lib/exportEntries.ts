import type { EntryKind, StoreEntry } from "./types";

// Excel reads dates as UTC, so shift timestamps to keep the store's local date and time.
const localTime = (iso: string) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000); };
// Item numbers are written as text so barcodes keep their leading zeros.
const text = (value: string | null | undefined) => ({ value: value ?? undefined, type: String });
const number = (value: number | null | undefined) => ({ value: value ?? undefined, type: Number });

export async function downloadEntries(entries: StoreEntry[], kind: EntryKind) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const orders = kind === "order_request";
  const titles = orders
    ? ["Date", "Item number", "Description", "Aisle", "Quantity required", "Status"]
    : ["Date", "Item number", "Description", "Aisle", "Department", "On hand", "Best before", "Status"];
  const header = titles.map(value => ({ value, fontWeight: "bold" as const }));
  const rows = entries.map(e => {
    const date = { value: localTime(e.created_at), type: Date, format: "yyyy-mm-dd hh:mm" };
    return orders
      ? [date, text(e.item_number), text(e.description), text(e.aisle), number(e.quantity_required), text(e.status)]
      : [date, text(e.item_number), text(e.description), text(e.aisle), text(e.department), number(e.on_hand),
         { value: e.best_before ? new Date(e.best_before) : undefined, type: Date, format: "yyyy-mm-dd" }, text(e.status)];
  });
  const widths = orders ? [18, 16, 44, 22, 18, 12] : [18, 16, 44, 22, 16, 10, 14, 12];
  const today = localTime(new Date().toISOString()).toISOString().slice(0, 10);
  await writeXlsxFile([header, ...rows], { columns: widths.map(width => ({ width })), stickyRowsCount: 1 })
    .toFile(`${orders ? "order-requests" : "received-inventory"}-${today}.xlsx`);
}
