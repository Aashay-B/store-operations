export type Department = { id: number; name: string };
export type Aisle = { id: number; name: string };
export type Product = {
  id: string; item_number: string; description: string; uip: number; reg_price: number;
  department_id: number | null; begin_date: string | null; end_date: string | null;
};
export type ProductInput = Omit<Product, "id">;
export type EntryKind = "order_request" | "inventory_cycle";
// Where counted stock sits: on the sales floor (shelf) or in the back-room overstock (bin).
export type StockLocation = "shelf" | "bin";
export type StoreEntry = {
  id: string; kind: EntryKind; item_number: string; description: string; aisle: string;
  quantity_required?: number | null; department?: string | null; on_hand?: number | null;
  best_before?: string | null; location?: StockLocation | null; status: "open" | "reviewed" | "completed"; created_at: string;
};
