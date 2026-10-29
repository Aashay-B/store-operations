"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ClipboardList, Download, PackageCheck, Plus, ScanLine } from "lucide-react";
import Shell from "./Shell";
import { isConfigured, listAllEntries, listEntries } from "@/lib/entries";
import { downloadEntries } from "@/lib/exportEntries";
import type { EntryKind, StoreEntry } from "@/lib/types";

const label = (entry: StoreEntry) => entry.kind === "order_request" ? "Order request" : "Inventory cycle";
const matches = (entry: StoreEntry, query: string) => `${entry.item_number} ${entry.description} ${entry.aisle}`.toLowerCase().includes(query.toLowerCase());

export default function StoreDashboard() {
  const [entries, setEntries] = useState<StoreEntry[]>([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<EntryKind>("order_request");
  const [error, setError] = useState("");
  useEffect(() => { listEntries().then(setEntries).catch(() => setError("Records could not be loaded. Check the Supabase connection.")); }, []);
  const shown = useMemo(() => entries.filter((entry) => entry.kind === view && matches(entry, query)), [entries, query, view]);
  const [exporting, setExporting] = useState(false);
  async function exportView() {
    setExporting(true);
    try { await downloadEntries((await listAllEntries(view)).filter((entry) => matches(entry, query)), view); }
    catch (e) { console.error("Export failed:", e); window.alert("Couldn’t export the records. Please try again."); }
    finally { setExporting(false); }
  }
  const orders = entries.filter((entry) => entry.kind === "order_request").length;
  const cycles = entries.filter((entry) => entry.kind === "inventory_cycle").length;

  return (
    <Shell>
      <section className="hero">
        <p className="eyebrow">STORE APP · LIVE WORKSPACE</p>
        <h1>Keep the floor moving.</h1>
        <p>Submit requests, run inventory counts, and see the working data in one place.</p>
        <Link href="/store-ops/new" className="hero-action"><Plus size={18} /> Create an entry</Link>
      </section>
      {!isConfigured() && <div className="notice">Demo mode is on. Add your standalone Supabase keys to <code>.env.local</code> before deploying.</div>}
      <section className="content">
        <div className="metrics">
          <article><ClipboardList /><span><b>{entries.length}</b><small>Today&apos;s entries</small></span></article>
          <article><PackageCheck /><span><b>{orders}</b><small>Order requests</small></span></article>
          <article><ScanLine /><span><b>{cycles}</b><small>Inventory cycles</small></span></article>
        </div>
        <div className="panel">
          <div className="panel-head"><div className="view-switch">
            <button className={view === "order_request" ? "selected" : ""} aria-pressed={view === "order_request"} onClick={() => setView("order_request")}><PackageCheck size={17} /> View order requests</button>
            <button className={view === "inventory_cycle" ? "selected" : ""} aria-pressed={view === "inventory_cycle"} onClick={() => setView("inventory_cycle")}><ScanLine size={17} /> View received inventory</button>
          </div>
          <div className="panel-tools">
            <input aria-label="Search records" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search item, description or aisle" />
            <button className="secondary" onClick={exportView} disabled={exporting}><Download size={16} /> {exporting ? "Exporting…" : "Export to Excel"}</button>
          </div></div>
          {error ? <p className="empty">{error}</p> : <div className="records">
            {shown.map((entry) => (
              <article className="record" key={entry.id}>
                <div className="record-symbol">{entry.kind === "order_request" ? "OR" : "IC"}</div>
                <div className="record-body"><div><b>{entry.description}</b><span className="status">{entry.status}</span></div><p>#{entry.item_number} · {entry.aisle} · {label(entry)}</p></div>
                <div className="record-value">{entry.kind === "order_request" ? `${entry.quantity_required} requested` : `${entry.on_hand} on hand`}<small>{new Date(entry.created_at).toLocaleDateString()}</small></div>
                <ArrowUpRight size={18} />
              </article>
            ))}
            {shown.length === 0 && <p className="empty">{view === "order_request" ? "No matching order requests yet." : "No matching inventory records yet."}</p>}
          </div>}
        </div>
      </section>
    </Shell>
  );
}
