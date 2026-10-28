"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ClipboardList, PackageCheck, Plus, ScanLine } from "lucide-react";
import Shell from "./Shell";
import { isConfigured, listEntries } from "@/lib/entries";
import type { StoreEntry } from "@/lib/types";

const label = (entry: StoreEntry) => entry.kind === "order_request" ? "Order request" : "Inventory cycle";

export default function StoreDashboard() {
  const [entries, setEntries] = useState<StoreEntry[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { listEntries().then(setEntries).catch(() => setError("Records could not be loaded. Check the Supabase connection.")); }, []);
  const shown = useMemo(() => entries.filter((entry) => `${entry.item_number} ${entry.description} ${entry.aisle}`.toLowerCase().includes(query.toLowerCase())), [entries, query]);
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
          <div className="panel-head"><div><p className="eyebrow">WORKING DATA</p><h2>Recent activity</h2></div><input aria-label="Search records" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search item, description or aisle" /></div>
          {error ? <p className="empty">{error}</p> : <div className="records">
            {shown.map((entry) => (
              <article className="record" key={entry.id}>
                <div className="record-symbol">{entry.kind === "order_request" ? "OR" : "IC"}</div>
                <div className="record-body"><div><b>{entry.description}</b><span className="status">{entry.status}</span></div><p>#{entry.item_number} · {entry.aisle} · {label(entry)}</p></div>
                <div className="record-value">{entry.kind === "order_request" ? `${entry.quantity_required} requested` : `${entry.on_hand} on hand`}<small>{new Date(entry.created_at).toLocaleDateString()}</small></div>
                <ArrowUpRight size={18} />
              </article>
            ))}
            {shown.length === 0 && <p className="empty">No matching records yet.</p>}
          </div>}
        </div>
      </section>
    </Shell>
  );
}
