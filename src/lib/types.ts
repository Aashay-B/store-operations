export type EntryKind = "order_request" | "inventory_cycle";
export type StoreEntry = {
  id: string; kind: EntryKind; item_number: string; description: string; aisle: string;
  quantity_required?: number | null; department?: string | null; on_hand?: number | null;
  best_before?: string | null; status: "open" | "reviewed" | "completed"; created_at: string;
};
