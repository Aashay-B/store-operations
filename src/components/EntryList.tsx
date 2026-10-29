"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Download } from "lucide-react";
import Shell from "./Shell";
import { isConfigured, listAllEntries } from "@/lib/entries";
import { downloadEntries } from "@/lib/exportEntries";
import type { EntryKind, StoreEntry } from "@/lib/types";

const matches = (entry: StoreEntry, query: string) => `${entry.item_number} ${entry.description} ${entry.aisle}`.toLowerCase().includes(query.toLowerCase());

export default function EntryList({ kind }: { kind: EntryKind }) {
  const orders = kind === "order_request";
  const [entries, setEntries] = useState<StoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    listAllEntries(kind).then(setEntries)
      .catch((e) => { console.error("Loading records failed:", e); setError("Records could not be loaded. Check the Supabase connection."); })
      .finally(() => setLoading(false));
  }, [kind]);
  const shown = useMemo(() => entries.filter((entry) => matches(entry, query)), [entries, query]);

  async function exportShown() {
    setExporting(true);
    try { await downloadEntries(shown, kind); }
    catch (e) { console.error("Export failed:", e); window.alert("Couldn’t export the records. Please try again."); }
    finally { setExporting(false); }
  }

  return (
    <Shell>
      <section className="page-head">
        <div>
          <Link className="back" href="/store-ops"><ArrowLeft size={17} /> Back to dashboard</Link>
          <p className="eyebrow">RECORDS</p>
          <h1>{orders ? "Order requests" : "Received inventory"}</h1>
        </div>
      </section>
      {!isConfigured() && <div className="notice">Demo mode is on. Add your standalone Supabase keys to <code>.env.local</code> before deploying.</div>}
      <section className="content">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-count">{loading ? "Loading…" : `${shown.length.toLocaleString()} record${shown.length === 1 ? "" : "s"}`}</p>
            <div className="panel-tools">
              <input aria-label="Search records" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search item, description or aisle" />
              <button className="secondary" onClick={exportShown} disabled={exporting || loading || !shown.length}><Download size={16} /> {exporting ? "Exporting…" : "Export to Excel"}</button>
            </div>
          </div>
          {error ? <p className="empty">{error}</p> : <div className="records">
            {shown.map((entry) => (
              <article className="record" key={entry.id}>
                <div className="record-symbol">{orders ? "OR" : "IC"}</div>
                <div className="record-body"><div><b>{entry.description}</b><span className="status">{entry.status}</span></div><p>#{entry.item_number} · {entry.aisle}{entry.department ? ` · ${entry.department}` : ""}</p></div>
                <div className="record-value">{orders ? `${entry.quantity_required} requested` : `${entry.on_hand} on hand`}<small>{new Date(entry.created_at).toLocaleDateString()}</small></div>
                <ArrowUpRight size={18} />
              </article>
            ))}
            {!loading && shown.length === 0 && <p className="empty">{orders ? "No matching order requests yet." : "No matching inventory records yet."}</p>}
          </div>}
        </div>
      </section>
    </Shell>
  );
}
