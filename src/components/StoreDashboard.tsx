"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, ClipboardList, PackageCheck, Plus, ScanLine } from "lucide-react";
import Shell from "./Shell";
import { isConfigured, listEntries } from "@/lib/entries";
import type { StoreEntry } from "@/lib/types";

export default function StoreDashboard() {
  const [entries, setEntries] = useState<StoreEntry[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { listEntries().then(setEntries).catch(() => setError("Records could not be loaded. Check the Supabase connection.")); }, []);
  const orders = entries.filter((entry) => entry.kind === "order_request").length;
  const cycles = entries.filter((entry) => entry.kind === "inventory_cycle").length;

  return (
    <Shell>
      <section className="hero">
        <h1>Store Stock Management</h1>
      </section>
      {!isConfigured() && <div className="notice">Demo mode is on. Add your standalone Supabase keys to <code>.env.local</code> before deploying.</div>}
      {error && <div className="notice">{error}</div>}
      <section className="content">
        <div className="metrics">
          <article><ClipboardList /><span><b>{entries.length}</b><small>Today&apos;s entries</small></span></article>
          <article><PackageCheck /><span><b>{orders}</b><small>Order requests</small></span></article>
          <article><ScanLine /><span><b>{cycles}</b><small>Inventory cycles</small></span></article>
        </div>
        <div className="panel action-panel">
          <Link className="action-btn primary-action" href="/store-ops/new"><Plus size={18} /> Create an entry</Link>
          <Link className="action-btn" href="/store-ops/orders"><PackageCheck size={18} /> View order requests</Link>
          <Link className="action-btn" href="/store-ops/inventory"><ScanLine size={18} /> View received inventory</Link>
          <Link className="action-btn" href="/store-ops/expiry"><CalendarClock size={18} /> Expiry dashboard</Link>
        </div>
      </section>
    </Shell>
  );
}
