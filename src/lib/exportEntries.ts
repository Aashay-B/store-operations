import type { EntryKind, StoreEntry } from "./types";

// Excel reads dates as UTC, so shift timestamps to keep the store's local date and time.
const localTime = (iso: string) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000); };
// Item numbers are written as text so barcodes keep their leading zeros.
const text = (value: string | null | undefined) => ({ value: value ?? undefined, type: String });
const number = (value: number | null | undefined) => ({ value: value ?? undefined, type: Number });

// Order requests follow the store's paper order sheet: bordered grid, yellow UPC and Qty columns,
// a blank Notes column, and empty rows at the bottom for writing in extra items.
const BLANK_ORDER_ROWS = 10;
const border = { borderStyle: "thin" as const, borderColor: "#000000" };
const yellow = { backgroundColor: "#FFFF00" };
const centered = { align: "center" as const, alignVertical: "center" as const };

function orderSheet(entries: StoreEntry[]) {
  const header = ["Date\nMM/DD/YY", "UPC", "Description Item", "Qty\nReq", "Notes"].map((value, i) => ({
    value, fontWeight: "bold" as const, wrap: true, height: 32, ...centered, ...border, ...(i === 1 || i === 3 ? yellow : {}),
  }));
  const row = (e?: StoreEntry) => [
    { value: e ? localTime(e.created_at) : undefined, type: Date, format: "mm/dd/yyyy", fontWeight: "bold" as const, ...centered, ...border },
    { ...text(e?.item_number), fontWeight: "bold" as const, ...centered, ...border, ...yellow },
    { ...text(e?.description), alignVertical: "center" as const, ...border },
    { ...number(e?.quantity_required), fontWeight: "bold" as const, ...centered, ...border, ...yellow },
    { ...text(undefined), ...border },
  ];
  return {
    data: [header, ...entries.map(row), ...Array.from({ length: BLANK_ORDER_ROWS }, () => row())],
    widths: [13, 16, 46, 7, 30],
  };
}

function inventorySheet(entries: StoreEntry[]) {
  const header = ["Date", "Item number", "Description", "Aisle", "Department", "Shelf / bin", "On hand", "Best before", "Status"].map(value => ({ value, fontWeight: "bold" as const }));
  const rows = entries.map(e => [
    { value: localTime(e.created_at), type: Date, format: "yyyy-mm-dd hh:mm" }, text(e.item_number), text(e.description), text(e.aisle),
    text(e.department), text(e.location === "shelf" ? "Shelf" : e.location === "bin" ? "Bin" : undefined), number(e.on_hand),
    { value: e.best_before ? new Date(e.best_before) : undefined, type: Date, format: "yyyy-mm-dd" }, text(e.status),
  ]);
  return { data: [header, ...rows], widths: [18, 16, 44, 22, 16, 11, 10, 14, 12] };
}

export async function downloadEntries(entries: StoreEntry[], kind: EntryKind) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const orders = kind === "order_request";
  const { data, widths } = orders ? orderSheet(entries) : inventorySheet(entries);
  const today = localTime(new Date().toISOString()).toISOString().slice(0, 10);
  await writeXlsxFile(data, { columns: widths.map(width => ({ width })), stickyRowsCount: 1 })
    .toFile(`${orders ? "order-requests" : "received-inventory"}-${today}.xlsx`);
}
