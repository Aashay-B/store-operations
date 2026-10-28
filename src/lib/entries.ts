import { createClient } from "@supabase/supabase-js";
import type { Aisle, Department, Product, StoreEntry } from "./types";

const sample: StoreEntry[] = [
  { id: "sample-1", kind: "order_request", item_number: "753459939314", description: "Organic Red Kidney Beans Bombini 398ml", aisle: "Aisle 4", quantity_required: 12, status: "open", created_at: "2026-10-28T14:20:00Z" },
  { id: "sample-2", kind: "inventory_cycle", item_number: "752394008211", description: "Cioffi's Hot Italian Sausage", aisle: "Deli", department: "Deli", on_hand: 6, best_before: "2026-10-30", status: "reviewed", created_at: "2026-10-28T10:05:00Z" }
];

const sampleDepartments: Department[] = ["Deli", "Meat", "Kitchen", "Bin/Office", "Juneau"].map((name, i) => ({ id: i + 1, name }));
const sampleAisles: Aisle[] = ["FREEZER 1", "ANCHOVIES & PICKLES", "FREEZER 2", "PASTA B", "PASTA C", "BEANS", "RICE", "PASTA A", "OLIVES", "CAPERS & MUSTARD", "COFFEE", "HONEY & CHERRIES", "JAMS", "TUNA", "GNOCCHI & MUSH", "VINEGARS", "SEASONING & STOCKS", "SPICES", "BAKING", "TARALLI", "COOKIES A", "COOKIES B", "TOMATO CANS", "CONDIMENTS", "CRACKERS", "FLOUR", "DRINKS", "CHOCOLATE 1", "CHOCOLATE 2", "CLEANING PRODUCTS", "SALT", "EVOO", "BOMBINI", "SEASONAL SHELF", "MILKA & CHOC 1", "HARD CANDY"].map((name, i) => ({ id: i + 1, name }));

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
export async function listDepartments(): Promise<Department[]> {
  if (supabase) { const { data, error } = await supabase.from("departments").select("id, name").order("name"); if (error) throw error; return data as Department[]; }
  return sampleDepartments;
}
export async function listAisles(): Promise<Aisle[]> {
  if (supabase) { const { data, error } = await supabase.from("aisles").select("id, name").order("sort_order"); if (error) throw error; return data as Aisle[]; }
  return sampleAisles;
}
// Many item numbers lost their leading zeros in Excel (e.g. 41338201103 for barcode 041338201103),
// so match the scanned code against every zero-padded form of it, preferring an exact match.
export async function findProduct(code: string): Promise<Product | null> {
  const scanned = code.trim(); if (!supabase || !scanned) return null;
  const bare = scanned.replace(/^0+/, ""); const candidates = new Set([scanned]);
  if (bare) for (let n = bare.length; n <= 14; n++) candidates.add(bare.padStart(n, "0"));
  const { data, error } = await supabase.from("products").select("item_number, description").in("item_number", [...candidates]).limit(10);
  if (error) throw error;
  return data.find(p => p.item_number === scanned) ?? data[0] ?? null;
}
export async function createEntry(input: Omit<StoreEntry, "id" | "created_at" | "status">) {
  const entry: StoreEntry = { ...input, id: crypto.randomUUID(), created_at: new Date().toISOString(), status: "open" };
  if (supabase) { const { error } = await supabase.from("store_entries").insert(entry); if (error) throw error; return; }
  const current = await listEntries(); window.localStorage.setItem(localKey, JSON.stringify([entry, ...current.filter(x => !x.id.startsWith("sample-"))]));
}
