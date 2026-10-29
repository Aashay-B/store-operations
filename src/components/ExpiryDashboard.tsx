"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, DollarSign, RefreshCw, Star } from "lucide-react";
import Shell from "./Shell";
import { isConfigured, listAllEntries } from "@/lib/entries";
import { findPrices } from "@/lib/products";
import {
  currentLots, LOCATIONS, locationLabel, NO_DEPARTMENT, parseDate, rotationIssues, sumUnits, toDateInput, weeklyBuckets,
  type Lot, type LotLocation, type RotationIssue, type WeekBucket,
} from "@/lib/expiry";
import type { StoreEntry } from "@/lib/types";

const WINDOWS = [7, 14, 30, 60];
const WEEKS = 12;
const TOP_DEPARTMENTS = 7;

type Measure = "units" | "value";
type Prices = Map<string, number>;
type DepartmentRow = { name: string; amount: number; units: number; lots: number };

const fmtDate = (date: string) => parseDate(date).toLocaleDateString();
const fmtMoney = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
const batches = (n: number) => plural(n, "batch", "batches");
const daysText = (days: number) => days < 0 ? `Expired ${-days} day${days === -1 ? "" : "s"} ago` : days === 0 ? "Expires today" : days === 1 ? "Expires tomorrow" : `${days} days left`;
const tone = (days: number) => days < 0 ? "critical" : days <= 7 ? "urgent" : days <= 14 ? "soon" : "";
const lotValue = (lot: Lot, prices: Prices) => prices.has(lot.item_number) ? lot.on_hand * prices.get(lot.item_number)! : null;
const totalValue = (lots: Lot[], prices: Prices) => lots.reduce((n, lot) => n + (lotValue(lot, prices) ?? 0), 0);
const unpricedCount = (lots: Lot[], prices: Prices) => lots.filter((lot) => !prices.has(lot.item_number)).length;

// Hover shows a mark's tooltip with a mouse. On touch screens, tapping a mark focuses it and the tooltip
// stays open until something else is tapped (a touch "leave" fires straight after the tap).
function hoverProps<T>(id: T, setActive: (id: T | null) => void) {
  return {
    tabIndex: 0,
    onPointerEnter: (e: React.PointerEvent) => { if (e.pointerType === "mouse") setActive(id); },
    onPointerLeave: (e: React.PointerEvent) => { if (e.pointerType === "mouse") setActive(null); },
    onFocus: () => setActive(id),
    onBlur: () => setActive(null),
  };
}

// A round axis maximum with an even midpoint, so both gridline labels are clean numbers.
function niceMax(value: number) {
  if (value <= 2) return 2;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= value / 2)!;
  return step * 2;
}

export default function ExpiryDashboard() {
  const [entries, setEntries] = useState<StoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [asOf, setAsOf] = useState(() => toDateInput(new Date()));
  const [windowDays, setWindowDays] = useState(30);
  const [location, setLocation] = useState<"all" | LotLocation>("all");
  const [department, setDepartment] = useState("all");
  const [measureChoice, setMeasureChoice] = useState<Measure>("value");
  const [prices, setPrices] = useState<Prices>(new Map());

  useEffect(() => {
    listAllEntries("inventory_cycle").then(setEntries)
      .catch((e) => { console.error("Loading inventory counts failed:", e); setError("Inventory counts could not be loaded. Check the Supabase connection."); })
      .finally(() => setLoading(false));
  }, []);

  const allLots = useMemo(() => currentLots(entries, asOf), [entries, asOf]);
  const itemKey = useMemo(() => [...new Set(allLots.map((l) => l.item_number))].sort().join(","), [allLots]);
  useEffect(() => {
    if (!itemKey) return;
    findPrices(itemKey.split(",")).then(setPrices).catch((e) => console.error("Loading prices failed:", e));
  }, [itemKey]);

  // Charts can only show value once prices have loaded for at least one batch.
  const hasPrices = allLots.some((l) => prices.has(l.item_number));
  const measure: Measure = hasPrices ? measureChoice : "units";
  const amountOf = useMemo(() => measure === "units" ? (l: Lot) => l.on_hand : (l: Lot) => lotValue(l, prices) ?? 0, [measure, prices]);
  const fmtAmount = measure === "units" ? (n: number) => n.toLocaleString() : fmtMoney;
  const fmtAxis = measure === "units" ? (n: number) => n.toLocaleString() : (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: n < 10 ? 2 : 0 })}`;
  const measureName = measure === "units" ? "Units" : "Retail value";

  const departments = useMemo(() => [...new Set(allLots.map((l) => l.department))].sort(), [allLots]);
  const inDepartment = useMemo(() => allLots.filter((l) => department === "all" || l.department === department), [allLots, department]);
  const lots = useMemo(() => inDepartment.filter((l) => location === "all" || l.location === location), [inDepartment, location]);

  const expired = useMemo(() => lots.filter((l) => l.days < 0).sort((a, b) => a.days - b.days), [lots]);
  const expiring = useMemo(() => lots.filter((l) => l.days >= 0 && l.days <= windowDays).sort((a, b) => a.days - b.days), [lots, windowDays]);
  const rotation = useMemo(() => rotationIssues(inDepartment), [inDepartment]);
  const weeks = useMemo(() => weeklyBuckets(lots, asOf, WEEKS, amountOf), [lots, asOf, amountOf]);
  const byDepartment = useMemo(() => {
    const totals = new Map<string, DepartmentRow>();
    for (const lot of expiring) {
      const row = totals.get(lot.department) ?? { name: lot.department, amount: 0, units: 0, lots: 0 };
      row.amount += amountOf(lot); row.units += lot.on_hand; row.lots += 1; totals.set(lot.department, row);
    }
    const rows = [...totals.values()].sort((a, b) => b.amount - a.amount);
    if (rows.length <= TOP_DEPARTMENTS) return rows;
    const rest = rows.slice(TOP_DEPARTMENTS - 1);
    const other = rest.reduce((sum, r) => ({ ...sum, amount: sum.amount + r.amount, units: sum.units + r.units, lots: sum.lots + r.lots }), { name: "Other", amount: 0, units: 0, lots: 0 });
    return [...rows.slice(0, TOP_DEPARTMENTS - 1), other];
  }, [expiring, amountOf]);

  const expiringUnpriced = unpricedCount(expiring, prices);
  const biggest = useMemo(() => expiring.filter((l) => prices.has(l.item_number)).sort((a, b) => lotValue(b, prices)! - lotValue(a, prices)!)[0], [expiring, prices]);
  const valueOrDash = (lotsToSum: Lot[]) => hasPrices || !lotsToSum.length ? fmtMoney(totalValue(lotsToSum, prices)) : "—";
  const unpricedNote = measure === "value" && expiringUnpriced ? `${batches(expiringUnpriced)} without a price ${expiringUnpriced === 1 ? "isn’t" : "aren’t"} included.` : "";
  const isToday = asOf === toDateInput(new Date());

  return (
    <Shell>
      <section className="page-head">
        <div>
          <Link className="back" href="/store-ops"><ArrowLeft size={17} /> Back to dashboard</Link>
          <p className="eyebrow">BEST-BEFORE CONTROL</p>
          <h1>Expiry dashboard</h1>
        </div>
      </section>
      {!isConfigured() && <div className="notice">Demo mode is on. These numbers come from sample counts, not your store, and no prices are loaded.</div>}
      <section className="content expiry-dash">
        <div className="dash-filters" role="group" aria-label="Dashboard filters">
          <label><span>As of</span><input type="date" value={asOf} onChange={(e) => e.target.value && setAsOf(e.target.value)} /></label>
          <label><span>Expiring within</span>
            <select value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value))}>{WINDOWS.map((w) => <option key={w} value={w}>{w} days</option>)}</select>
          </label>
          <label><span>Location</span>
            <select value={location} onChange={(e) => setLocation(e.target.value as "all" | LotLocation)}>
              <option value="all">Shelf and bin</option>
              {LOCATIONS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
          </label>
          <label><span>Department</span>
            <select value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="all">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <div className="filter-field"><span>Charts show</span>
            <div className="seg-toggle">
              <button aria-pressed={measure === "value"} onClick={() => setMeasureChoice("value")} disabled={!hasPrices} title={hasPrices ? undefined : "No prices found for these products"}>Retail value</button>
              <button aria-pressed={measure === "units"} onClick={() => setMeasureChoice("units")}>Units</button>
            </div>
          </div>
          {!isToday && <button className="secondary" onClick={() => setAsOf(toDateInput(new Date()))}>Back to today</button>}
        </div>

        {error ? <div className="panel"><p className="empty">{error}</p></div> : loading ? <div className="panel"><p className="empty">Loading…</p></div> : !allLots.length ? (
          <div className="panel"><p className="empty">No stock with a best-before date had been counted as of {fmtDate(asOf)}. Record an inventory cycle to start tracking.</p></div>
        ) : <>
          <div className="kpi-grid">
            <Kpi icon={<DollarSign size={18} />} label={`Value expiring in the next ${windowDays} days`} value={valueOrDash(expiring)}
              sub={`${plural(sumUnits(expiring), "unit")} in ${batches(expiring.length)}${expiringUnpriced ? ` · ${expiringUnpriced} without a price` : ""}`} />
            <Kpi icon={<AlertTriangle size={18} />} tone="critical" label="Expired stock still on hand" value={valueOrDash(expired)}
              sub={expired.length ? `${plural(sumUnits(expired), "unit")} in ${batches(expired.length)} to pull` : "Nothing to pull"} />
            <Kpi icon={<Star size={18} />} label="Highest-value batch expiring" value={biggest ? fmtMoney(lotValue(biggest, prices)!) : "—"}
              sub={biggest ? `${biggest.description} · ${daysText(biggest.days).toLowerCase()}` : "No priced batches in this window"} />
            <Kpi icon={<RefreshCw size={18} />} tone={rotation.length ? "serious" : undefined} label="Rotation issues" value={rotation.length.toLocaleString()}
              sub={rotation.length ? `${plural(sumUnits(rotation.map((r) => r.bin)), "unit")} of older stock in the bin` : "Bin stock older than the shelf"} />
          </div>

          <div className="chart-grid">
            <ChartCard title="When stock expires" subtitle={`${measureName} by best-before week, next ${WEEKS} weeks from ${fmtDate(asOf)}`} foot={unpricedNote}>
              <ExpiryCalendar weeks={weeks} fmtAmount={fmtAmount} fmtAxis={fmtAxis} />
            </ChartCard>
            <ChartCard title={`Expiring in ${windowDays} days, by department`} subtitle={measureName} foot={unpricedNote}>
              <DepartmentBars rows={byDepartment} fmtAmount={fmtAmount} />
            </ChartCard>
          </div>

          <LotTable title="Expired: pull from sale" note="Best-before date has passed but stock was still counted" lots={expired} prices={prices} hasPrices={hasPrices} empty="No expired stock on hand." />
          <LotTable title={`Expiring in the next ${windowDays} days`} note="Sell first, mark down or move to the front" lots={expiring} prices={prices} hasPrices={hasPrices} empty={`Nothing expires in the next ${windowDays} days.`} />
          <RotationTable issues={rotation} prices={prices} />
          <p className="dash-note">Based on the latest count of each batch on or before {fmtDate(asOf)}. Batches last counted at 0 are treated as used up. Values use each product’s regular price from the products list.</p>
        </>}
      </section>
    </Shell>
  );
}

function Kpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone?: "critical" | "serious" }) {
  return (
    <article className={`kpi${tone ? ` ${tone}` : ""}`}>
      <span className="kpi-label">{icon}{label}</span>
      <b className="kpi-value">{value}</b>
      <small>{sub}</small>
    </article>
  );
}

function ChartCard({ title, subtitle, foot, children }: { title: string; subtitle: string; foot?: string; children: React.ReactNode }) {
  return <section className="chart-card"><div className="chart-head"><h2>{title}</h2><p>{subtitle}</p></div>{children}{foot && <p className="chart-foot">{foot}</p>}</section>;
}

function ExpiryCalendar({ weeks, fmtAmount, fmtAxis }: { weeks: WeekBucket[]; fmtAmount: (n: number) => string; fmtAxis: (n: number) => string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...weeks.map((w) => w.total)));
  const series = LOCATIONS.filter((s) => weeks.some((w) => w[s.key] > 0));
  const peak = weeks.reduce((best, w, i) => w.total > weeks[best].total ? i : best, 0);
  const weekEnd = (w: WeekBucket) => { const end = new Date(w.start); end.setDate(end.getDate() + 6); return end.toLocaleDateString(undefined, { month: "short", day: "numeric" }); };
  if (!weeks.some((w) => w.total)) return <p className="chart-empty">Nothing expires in the next {WEEKS} weeks.</p>;

  return (
    <>
      {series.length > 1 && <div className="legend">{series.map((s) => <span key={s.key}><i className={`swatch ${s.key}`} />{s.label}</span>)}</div>}
      <div className="col-chart">
        <div className="col-axis" aria-hidden="true">{[max, max / 2, 0].map((t) => <span key={t} style={{ bottom: `${(t / max) * 100}%` }}>{fmtAxis(t)}</span>)}</div>
        <div className="col-plot">
          <div className="col-grid" aria-hidden="true">{[0, 0.5, 1].map((f) => <div key={f} className={`gridline${f === 0 ? " baseline" : ""}`} style={{ bottom: `${f * 100}%` }} />)}</div>
          {weeks.map((w, i) => (
            <div key={i} className={`col${active === i ? " active" : ""}`} {...hoverProps(i, setActive)}
              aria-label={`Week of ${w.label}: ${fmtAmount(w.total)}${series.map((s) => `, ${s.label} ${fmtAmount(w[s.key])}`).join("")}`}>
              <div className="col-bars">
                {w.total > 0 && <div className="col-stack" style={{ height: `${(w.total / max) * 100}%` }}>
                  {series.filter((s) => w[s.key] > 0).map((s) => <div key={s.key} className={`seg ${s.key}`} style={{ flexGrow: w[s.key] }} />)}
                </div>}
                {i === peak && w.total > 0 && <span className="col-cap" style={{ bottom: `${(w.total / max) * 100}%` }}>{fmtAmount(w.total)}</span>}
                {active === i && (
                  <div className={`tip${i < 2 ? " tip-start" : i > weeks.length - 3 ? " tip-end" : ""}`} role="tooltip">
                    <p className="tip-title">{w.label} – {weekEnd(w)}</p>
                    {series.map((s) => <p key={s.key}><i className={`key ${s.key}`} /><b>{fmtAmount(w[s.key])}</b> {s.label}</p>)}
                    {series.length > 1 && <p className="tip-total"><b>{fmtAmount(w.total)}</b> total</p>}
                  </div>
                )}
              </div>
              <span className="col-label">{w.label}</span>
            </div>
          ))}
        </div>
      </div>
      <details className="table-view">
        <summary>Show as table</summary>
        <table className="data-table">
          <thead><tr><th>Week of</th>{series.map((s) => <th key={s.key} className="num">{s.label}</th>)}<th className="num">Total</th></tr></thead>
          <tbody>{weeks.map((w, i) => <tr key={i}><td>{w.label} – {weekEnd(w)}</td>{series.map((s) => <td key={s.key} className="num">{fmtAmount(w[s.key])}</td>)}<td className="num">{fmtAmount(w.total)}</td></tr>)}</tbody>
        </table>
      </details>
    </>
  );
}

function DepartmentBars({ rows, fmtAmount }: { rows: DepartmentRow[]; fmtAmount: (n: number) => string }) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(0, ...rows.map((r) => r.amount));
  if (!max) return <p className="chart-empty">Nothing expires in this window.</p>;
  return (
    <div className="hbar-chart">
      {rows.map((r) => (
        <div key={r.name} className={`hbar${active === r.name ? " active" : ""}`} {...hoverProps(r.name, setActive)}
          aria-label={`${r.name}: ${fmtAmount(r.amount)}, ${r.units} units in ${r.lots} batches`}>
          <span className="hbar-label">{r.name}</span>
          <div className="hbar-track">
            <div className="hbar-area">
              <div className="hbar-fill" style={{ width: `${(r.amount / max) * 100}%` }} />
              <span className="hbar-value" style={{ left: `calc(${(r.amount / max) * 100}% + 6px)` }}>{fmtAmount(r.amount)}</span>
              {active === r.name && <div className="tip tip-start" role="tooltip"><p><b>{fmtAmount(r.amount)}</b></p><p><b>{r.units.toLocaleString()}</b> units in {batches(r.lots)}</p></div>}
            </div>
          </div>
        </div>
      ))}
      {rows.some((r) => r.name === NO_DEPARTMENT) && <p className="chart-foot">“{NO_DEPARTMENT}” is stock counted without a department.</p>}
    </div>
  );
}

function LotTable({ title, note, lots, prices, hasPrices, empty }: { title: string; note: string; lots: Lot[]; prices: Prices; hasPrices: boolean; empty: string }) {
  return (
    <section className="table-card">
      <div className="expiry-group-head"><b>{title}</b><span>{batches(lots.length)}{lots.length && hasPrices ? ` · ${fmtMoney(totalValue(lots, prices))}` : ""} · {note}</span></div>
      {!lots.length ? <p className="empty">{empty}</p> : (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Product</th><th>Location</th><th className="num">Units</th><th>Best before</th><th className="num">Retail value</th><th>Last counted</th></tr></thead>
            <tbody>{lots.map((lot) => {
              const value = lotValue(lot, prices);
              return (
                <tr key={lot.key}>
                  <td><b>{lot.description}</b><small>#{lot.item_number} · {lot.department}</small></td>
                  <td data-label="Location"><div>{locationLabel(lot.location)}<small>{lot.aisle}</small></div></td>
                  <td data-label="Units" className="num"><div>{lot.on_hand.toLocaleString()}</div></td>
                  <td data-label="Best before"><div>{fmtDate(lot.best_before)}<small><span className={`days-left ${tone(lot.days)}`}>{lot.days < 0 && <AlertTriangle size={11} />} {daysText(lot.days)}</span></small></div></td>
                  <td data-label="Retail value" className="num"><div>{value === null ? <span title="Not found in the products list">No price</span> : <>{fmtMoney(value)}<small>{fmtMoney(prices.get(lot.item_number)!)} each</small></>}</div></td>
                  <td data-label="Last counted"><div>{new Date(lot.counted_at).toLocaleDateString()}</div></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RotationTable({ issues, prices }: { issues: RotationIssue[]; prices: Prices }) {
  const withValue = (lot: Lot) => { const value = lotValue(lot, prices); return `${plural(lot.on_hand, "unit")}${value === null ? "" : ` · ${fmtMoney(value)}`} · ${daysText(lot.days)}`; };
  return (
    <section className="table-card">
      <div className="expiry-group-head"><b>Rotation issues</b><span>{plural(issues.length, "item")} · older stock is in the bin while newer stock is on the shelf. Move the bin batch forward.</span></div>
      {!issues.length ? <p className="empty">No rotation issues. Wherever both were counted, the shelf has the oldest stock.</p> : (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Product</th><th>Bin batch</th><th>Shelf batch</th><th className="num">Days apart</th></tr></thead>
            <tbody>{issues.map((issue) => (
              <tr key={issue.item_number}>
                <td><b>{issue.description}</b><small>#{issue.item_number}</small></td>
                <td data-label="Bin batch"><div>{fmtDate(issue.bin.best_before)}<small>{withValue(issue.bin)}</small></div></td>
                <td data-label="Shelf batch"><div>{fmtDate(issue.shelf.best_before)}<small>{withValue(issue.shelf)}</small></div></td>
                <td data-label="Days apart" className="num"><div>{issue.gap.toLocaleString()}</div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
