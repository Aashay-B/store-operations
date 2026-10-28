import { createClient } from "@supabase/supabase-js";
import type { StoreEntry } from "./types";

const sample: StoreEntry[] = [
  { id: "sample-1", kind: "order_request", item_number: "753459939314", description: "Organic Red Kidney Beans Bombini 398ml", aisle: "Aisle 4", quantity_required: 12, status: "open", created_at: "2026-10-28T14:20:00Z" },
  { id: "sample-2", kind: "inventory_cycle", item_number: "752394008211", description: "Cioffi's Hot Italian Sausage", aisle: "Deli", department: "Deli", on_hand: 6, best_before: "2026-10-30", status: "reviewed", created_at: "2026-10-28T10:05:00Z" }
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;
const localKey = "cioffis-store-entries";

export function isConfigured() { return Boolean(supabase); }
export async function listEntries(): Promise<StoreEntry[]> {
  if (supabase) { const { data, error } = await supabase.from("store_entries").select("*").order("created_at", { ascending: false }).limit(100); if (error) throw error; return data as StoreEntry[]; }
  if (typeof window === "undefined") return sample;
  const saved = window.localStorage.getItem(localKey); return saved ? JSON.parse(saved) : sample;
}
export async function createEntry(input: Omit<StoreEntry, "id" | "created_at" | "status">) {
  const entry: StoreEntry = { ...input, id: crypto.randomUUID(), created_at: new Date().toISOString(), status: "open" };
  if (supabase) { const { error } = await supabase.from("store_entries").insert(entry); if (error) throw error; return; }
  const current = await listEntries(); window.localStorage.setItem(localKey, JSON.stringify([entry, ...current.filter(x => !x.id.startsWith("sample-"))]));
}
