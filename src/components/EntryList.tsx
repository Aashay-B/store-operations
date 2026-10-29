"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Download } from "lucide-react";
import Shell from "./Shell";
import { isConfigured, listAllEntries } from "@/lib/entries";
import { downloadEntries } from "@/lib/exportEntries";
import type { EntryKind, StoreEntry } from "@/lib/types";

const matches = (entry: StoreEntry, query: string) => `${entry.item_number} ${entry.description} ${entry.aisle}`.toLowerCase().includes(query.toLowerCase());

// best_before is a plain YYYY-MM-DD date, so read it as a local date rather than UTC midnight.
const localDate = (date: string) => { const [y, m, d] = date.split("-").map(Number); return new Date(y, m - 1, d); };
const daysUntil = (date: string) => { const today = new Date(); today.setHours(0, 0, 0, 0); return Math.round((localDate(date).getTime() - today.getTime()) / 86400000); };
const daysLeft = (days: number) => days === 0 ? "Expires today" : days === 1 ? "Expires tomorrow" : `${days} days left`;
const EXPIRY_WINDOW = 30;
const EXPIRY_GROUPS = [
  { title: "Expiring this week", note: "best before within 7 days", min: 0, max: 7, tone: "urgent" },
  { title: "Expiring in 8–14 days", note: "best before in the next two weeks", min: 8, max: 14, tone: "soon" },
  { title: "Expiring in 15–30 days", note: "best before later this month", min: 15, max: EXPIRY_WINDOW, tone: "" },
];

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
  const expiring = useMemo(() => orders ? [] : entries
    .filter((entry) => entry.best_before)
    .map((entry) => ({ entry, days: daysUntil(entry.best_before!) }))
    .filter(({ days }) => days >= 0 && days <= EXPIRY_WINDOW)
    .sort((a, b) => a.days - b.days), [entries, orders]);

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
        {!orders && !error && !loading && (
          <div className="expiry">
            <h2 className="section-title">Expiring in the next {EXPIRY_WINDOW} days</h2>
            {expiring.length === 0 && <div className="panel"><p className="empty">Nothing expires in the next {EXPIRY_WINDOW} days.</p></div>}
            {EXPIRY_GROUPS.map((group) => {
              const items = expiring.filter(({ days }) => days >= group.min && days <= group.max);
              if (!items.length) return null;
              return (
                <section className={`expiry-group ${group.tone}`} key={group.title}>
                  <div className="expiry-group-head"><b>{group.title}</b><span>{items.length} item{items.length === 1 ? "" : "s"} · {group.note}</span></div>
                  <div className="expiry-cols" aria-hidden="true"><span>Product</span><span>On hand</span><span>Location</span><span>Best before</span></div>
                  {items.map(({ entry, days }) => (
                    <div className="expiry-row" key={entry.id}>
                      <div>
                        <b>{entry.description}</b>
                        <p>#{entry.item_number}</p>
                        <div className="chips">
                          <span className="chip">Counted {new Date(entry.created_at).toLocaleDateString()}</span>
                          <span className={`days-left ${group.tone}`}>{daysLeft(days)}</span>
                        </div>
                      </div>
                      <div data-label="On hand">{entry.on_hand}</div>
                      <div data-label="Location">{entry.aisle}{entry.department && <small>{entry.department}</small>}</div>
                      <div data-label="Best before">{localDate(entry.best_before!).toLocaleDateString()}</div>
                    </div>
                  ))}
                </section>
              );
            })}
          </div>
        )}
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
                <div className="record-body"><div><b>{entry.description}</b><span className="status">{entry.status}</span></div><p>#{entry.item_number} · {entry.aisle}{entry.department ? ` · ${entry.department}` : ""}{entry.best_before ? ` · Best before ${localDate(entry.best_before).toLocaleDateString()}` : ""}</p></div>
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
