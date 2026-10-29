import { supabase } from "./supabase";
import type { Product, ProductInput } from "./types";

export const PAGE_SIZE = 50;
const columns = "id, item_number, description, uip, reg_price, department_id, begin_date, end_date";

function db() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

export async function searchProducts(query: string, page: number): Promise<{ rows: Product[]; total: number }> {
  let request = db().from("products").select(columns, { count: "exact" }).order("description").range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  // Characters that would break PostgREST's or() filter syntax are treated as spaces.
  const term = query.replace(/[,()*%"\\]/g, " ").trim();
  if (term) request = request.or(`item_number.ilike.*${term}*,description.ilike.*${term}*`);
  const { data, error, count } = await request;
  if (error) throw error;
  return { rows: data as Product[], total: count ?? 0 };
}

export async function createProduct(input: ProductInput) {
  const { error } = await db().from("products").insert(input);
  if (error) throw error;
}

// Row-level security silently skips rows it doesn't allow, so check that a row was actually changed.
export async function updateProduct(id: string, input: ProductInput) {
  const { data, error } = await db().from("products").update(input).eq("id", id).select("id");
  if (error) throw error;
  if (!data.length) throw { code: "42501" };
}

export async function deleteProduct(id: string) {
  const { data, error } = await db().from("products").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data.length) throw { code: "42501" };
}

// Many item numbers lost their leading zeros in Excel (e.g. 41338201103 for barcode 041338201103),
// so match the scanned code against every zero-padded form of it, preferring an exact match.
export async function findProduct(code: string): Promise<Pick<Product, "item_number" | "description"> | null> {
  const scanned = code.trim(); if (!supabase || !scanned) return null;
  const bare = scanned.replace(/^0+/, ""); const candidates = new Set([scanned]);
  if (bare) for (let n = bare.length; n <= 14; n++) candidates.add(bare.padStart(n, "0"));
  const { data, error } = await supabase.from("products").select("item_number, description").in("item_number", [...candidates]).limit(10);
  if (error) throw error;
  return data.find(p => p.item_number === scanned) ?? data[0] ?? null;
}
