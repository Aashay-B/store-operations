import { supabase } from "./supabase";
import type { Aisle, Department, EntryKind, StoreEntry } from "./types";

const sample: StoreEntry[] = [
  { id: "sample-1", kind: "order_request", item_number: "753459939314", description: "Organic Red Kidney Beans Bombini 398ml", aisle: "Aisle 4", quantity_required: 12, status: "open", created_at: "2026-10-28T14:20:00Z" },
  { id: "sample-2", kind: "inventory_cycle", item_number: "752394008211", description: "Cioffi's Hot Italian Sausage", aisle: "Deli", department: "Deli", location: "shelf", on_hand: 6, best_before: "2026-10-30", status: "reviewed", created_at: "2026-10-28T10:05:00Z" },
  { id: "sample-3", kind: "inventory_cycle", item_number: "76580004912", description: "LOACKER QUADRATINI HAZELNUT 250G", aisle: "COOKIES A", department: "Grocery", location: "shelf", on_hand: 8, best_before: "2026-12-15", status: "open", created_at: "2026-10-27T15:30:00Z" },
  { id: "sample-4", kind: "inventory_cycle", item_number: "76580004912", description: "LOACKER QUADRATINI HAZELNUT 250G", aisle: "COOKIES A", department: "Grocery", location: "bin", on_hand: 12, best_before: "2026-11-20", status: "open", created_at: "2026-10-27T15:32:00Z" },
  { id: "sample-5", kind: "inventory_cycle", item_number: "8001405000024", description: "GRISSIN BON FETTE BISCOTT W/WHEAT 250gr", aisle: "CRACKERS", department: "Grocery", location: "shelf", on_hand: 10, best_before: "2026-10-20", status: "open", created_at: "2026-10-26T13:00:00Z" },
  { id: "sample-6", kind: "inventory_cycle", item_number: "62136190949", description: "TARALLI BARESI FENNEL TINA 300GR", aisle: "TARALLI", department: "Grocery", location: "bin", on_hand: 12, best_before: "2026-11-25", status: "open", created_at: "2026-10-26T13:10:00Z" }
];

const sampleDepartments: Department[] = ["Deli", "Meat", "Kitchen", "Bin/Office", "Juneau"].map((name, i) => ({ id: i + 1, name }));
const sampleAisles: Aisle[] = ["FREEZER 1", "ANCHOVIES & PICKLES", "FREEZER 2", "PASTA B", "PASTA C", "BEANS", "RICE", "PASTA A", "OLIVES", "CAPERS & MUSTARD", "COFFEE", "HONEY & CHERRIES", "JAMS", "TUNA", "GNOCCHI & MUSH", "VINEGARS", "SEASONING & STOCKS", "SPICES", "BAKING", "TARALLI", "COOKIES A", "COOKIES B", "TOMATO CANS", "CONDIMENTS", "CRACKERS", "FLOUR", "DRINKS", "CHOCOLATE 1", "CHOCOLATE 2", "CLEANING PRODUCTS", "SALT", "EVOO", "BOMBINI", "SEASONAL SHELF", "MILKA & CHOC 1", "HARD CANDY"].map((name, i) => ({ id: i + 1, name }));

const localKey = "cioffis-store-entries";

export function isConfigured() { return Boolean(supabase); }
export async function listEntries(): Promise<StoreEntry[]> {
  if (supabase) { const { data, error } = await supabase.from("store_entries").select("*").order("created_at", { ascending: false }).limit(100); if (error) throw error; return data as StoreEntry[]; }
  if (typeof window === "undefined") return sample;
  const saved = window.localStorage.getItem(localKey); return saved ? JSON.parse(saved) : sample;
}
// Every entry of one kind (not just the latest 100), fetched in pages for exporting.
export async function listAllEntries(kind: EntryKind): Promise<StoreEntry[]> {
  if (!supabase) return (await listEntries()).filter(e => e.kind === kind);
  const all: StoreEntry[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("store_entries").select("*").eq("kind", kind).order("created_at", { ascending: false }).range(from, from + 999);
    if (error) throw error; all.push(...(data as StoreEntry[])); if (data.length < 1000) return all;
  }
}
export async function listDepartments(): Promise<Department[]> {
  if (supabase) { const { data, error } = await supabase.from("departments").select("id, name").order("name"); if (error) throw error; return data as Department[]; }
  return sampleDepartments;
}
export async function listAisles(): Promise<Aisle[]> {
  if (supabase) { const { data, error } = await supabase.from("aisles").select("id, name").order("sort_order"); if (error) throw error; return data as Aisle[]; }
  return sampleAisles;
}
// Scanners and copy-paste can leave invisible characters (spaces, tabs, line breaks, zero-width
// characters) around an item number, which stops it matching the same product elsewhere.
export const cleanItemNumber = (value: string) => value.replace(/[\u0000-\u001F\u007F-\u009F​-‍﻿]/g, "").trim();

export async function createEntry(input: Omit<StoreEntry, "id" | "created_at" | "status">) {
  const entry: StoreEntry = { ...input, item_number: cleanItemNumber(input.item_number), id: crypto.randomUUID(), created_at: new Date().toISOString(), status: "open" };
  if (supabase) { const { error } = await supabase.from("store_entries").insert(entry); if (error) throw error; return; }
  const current = await listEntries(); window.localStorage.setItem(localKey, JSON.stringify([entry, ...current.filter(x => !x.id.startsWith("sample-"))]));
}
