"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Camera, Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import Shell from "./Shell";
import BarcodeScanner from "./BarcodeScanner";
import { isConfigured, listDepartments } from "@/lib/entries";
import { createProduct, deleteProduct, PAGE_SIZE, searchProducts, updateProduct } from "@/lib/products";
import type { Department, Product } from "@/lib/types";

type Draft = { item_number: string; description: string; uip: string; reg_price: string; department_id: string; begin_date: string; end_date: string };
const blank: Draft = { item_number: "", description: "", uip: "1", reg_price: "", department_id: "", begin_date: "", end_date: "" };
const toDraft = (p: Product): Draft => ({
  item_number: p.item_number, description: p.description, uip: String(p.uip), reg_price: String(p.reg_price),
  department_id: p.department_id ? String(p.department_id) : "", begin_date: p.begin_date ?? "", end_date: p.end_date ?? "",
});

function errorText(e: unknown) {
  const err = e as { code?: string; message?: string } | null;
  if (err?.code === "23505") return "A product with this item number already exists in that department.";
  if (err?.code === "42501") return "You don’t have permission to change products. Product editing needs to be enabled in Supabase.";
  return err?.message || "Something went wrong. Please try again.";
}

export default function ProductManager() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  useEffect(() => { listDepartments().then(setDepartments).catch((e) => console.error("Loading departments failed:", e)); }, []);
  useEffect(() => { const t = setTimeout(() => { setSearch(query); setPage(0); }, 300); return () => clearTimeout(t); }, [query]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchProducts(search, page)
      .then((result) => { if (cancelled) return; if (!result.rows.length && page > 0) { setPage(page - 1); return; } setRows(result.rows); setTotal(result.total); setError(""); })
      .catch((e) => { if (cancelled) return; console.error("Loading products failed:", e); setError("Products could not be loaded. Check the Supabase connection."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search, page, reloadKey]);

  const departmentName = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);
  const first = total ? page * PAGE_SIZE + 1 : 0;
  const last = Math.min(total, (page + 1) * PAGE_SIZE);

  async function remove(product: Product) {
    if (!window.confirm(`Delete "${product.description}" (#${product.item_number})? This can’t be undone.`)) return;
    try { await deleteProduct(product.id); setNotice("Product deleted."); setReloadKey((k) => k + 1); }
    catch (e) { console.error("Deleting product failed:", e); window.alert(errorText(e)); }
  }
  const onSaved = useCallback((message: string) => { setEditing(null); setNotice(message); setReloadKey((k) => k + 1); }, []);

  return (
    <Shell>
      <section className="page-head">
        <div><p className="eyebrow">PRODUCT LIST</p><h1>Products</h1></div>
        <button className="hero-action" onClick={() => setEditing("new")}><Plus size={18} /> Add product</button>
      </section>
      {!isConfigured() && <div className="notice">Demo mode is on. Managing products needs your Supabase keys in <code>.env.local</code>.</div>}
      {notice && <div className="notice" role="status">{notice}</div>}
      <section className="content">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-count">{loading ? "Loading…" : `${total.toLocaleString()} product${total === 1 ? "" : "s"}`}</p>
            <input aria-label="Search products" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search item number or description" />
          </div>
          {error ? <p className="empty">{error}</p> : <div>
            {rows.map((product) => (
              <article className="product-row" key={product.id}>
                <div className="product-main">
                  <b>{product.description}</b>
                  <p>#{product.item_number} · {product.department_id ? departmentName.get(product.department_id) ?? "Unknown department" : "No department"} · UIP {product.uip}</p>
                </div>
                <div className="product-price">${Number(product.reg_price).toFixed(2)}</div>
                <div className="row-actions">
                  <button className="icon-btn" onClick={() => setEditing(product)} aria-label={`Edit ${product.description}`} title="Edit"><Pencil size={16} /></button>
                  <button className="icon-btn danger" onClick={() => remove(product)} aria-label={`Delete ${product.description}`} title="Delete"><Trash2 size={16} /></button>
                </div>
              </article>
            ))}
            {!loading && rows.length === 0 && <p className="empty">No products match your search.</p>}
            {total > PAGE_SIZE && (
              <div className="pager">
                <span>Showing {first.toLocaleString()}–{last.toLocaleString()} of {total.toLocaleString()}</span>
                <div>
                  <button className="icon-btn" onClick={() => setPage(page - 1)} disabled={page === 0 || loading} aria-label="Previous page"><ChevronLeft size={16} /></button>
                  <button className="icon-btn" onClick={() => setPage(page + 1)} disabled={last >= total || loading} aria-label="Next page"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </div>}
        </div>
      </section>
      {editing && <ProductEditor product={editing === "new" ? null : editing} departments={departments} onClose={() => setEditing(null)} onSaved={onSaved} />}
    </Shell>
  );
}

function ProductEditor({ product, departments, onClose, onSaved }: { product: Product | null; departments: Department[]; onClose: () => void; onSaved: (message: string) => void }) {
  const [draft, setDraft] = useState<Draft>(product ? toDraft(product) : blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const set = (field: keyof Draft, value: string) => setDraft((d) => ({ ...d, [field]: value }));
  const onScan = useCallback((code: string) => { setDraft((d) => ({ ...d, item_number: code })); setScanning(false); }, []);
  const closeScanner = useCallback(() => setScanning(false), []);

  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    const input = {
      item_number: draft.item_number.trim(), description: draft.description, uip: Number(draft.uip), reg_price: Number(draft.reg_price),
      department_id: draft.department_id ? Number(draft.department_id) : null, begin_date: draft.begin_date || null, end_date: draft.end_date || null,
    };
    try {
      if (product) await updateProduct(product.id, input); else await createProduct(input);
      onSaved(product ? "Product updated." : "Product added.");
    } catch (err) { console.error("Saving product failed:", err); setError(errorText(err)); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="product-editor-title">
      <form className="modal" onSubmit={save}>
        <div className="modal-head">
          <h2 id="product-editor-title">{product ? "Edit product" : "Add product"}</h2>
          <button type="button" className="scanner-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="fields">
          <label><span>Item number <em>*</em></span>
            <div className="input-with-action">
              {/* Handheld scanners press Enter after the barcode; don't let that submit the form. */}
              <input required value={draft.item_number} onChange={(e) => set("item_number", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} placeholder="e.g. 753459939314" inputMode="numeric" />
              <button type="button" className="scan-btn" onClick={() => setScanning(true)} aria-label="Scan barcode with camera" title="Scan barcode"><Camera size={18} /><span>Scan</span></button>
            </div>
          </label>
          <label><span>Description <em>*</em></span><input required value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="What is the item?" /></label>
          <label><span>Regular price <em>*</em></span><input required type="number" min="0" step="0.01" value={draft.reg_price} onChange={(e) => set("reg_price", e.target.value)} placeholder="0.00" /></label>
          <label><span>UIP <em>*</em></span><input required type="number" min="1" step="1" value={draft.uip} onChange={(e) => set("uip", e.target.value)} /></label>
          <label><span>Department</span>
            <select value={draft.department_id} onChange={(e) => set("department_id", e.target.value)}>
              <option value="">No department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <span className="field-spacer" />
          <label><span>Begin date</span><input type="date" value={draft.begin_date} onChange={(e) => set("begin_date", e.target.value)} /></label>
          <label><span>End date</span><input type="date" min={draft.begin_date || undefined} value={draft.end_date} onChange={(e) => set("end_date", e.target.value)} /></label>
        </div>
        <div className="form-foot">
          <p className="form-error" role="alert">{error}</p>
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
            <button className="submit" disabled={busy}>{busy ? "Saving…" : <><Check size={17} /> Save product</>}</button>
          </div>
        </div>
      </form>
      {scanning && <BarcodeScanner onDetected={onScan} onClose={closeScanner} />}
    </div>
  );
}
