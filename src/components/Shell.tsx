"use client";
import Link from "next/link";
import { LayoutDashboard, Package, Plus } from "lucide-react";
export default function Shell({ children }: { children: React.ReactNode }) {
 return <main className="site-shell"><header><Link className="brand" href="/store-ops"><span className="brand-mark">C</span><span><b>Cioffi&apos;s</b><small>STORE OPERATIONS</small></span></Link><nav><Link href="/store-ops"><LayoutDashboard size={17}/> Records</Link><Link href="/store-ops/products"><Package size={17}/> Products</Link><Link className="primary" href="/store-ops/new"><Plus size={17}/> New entry</Link></nav></header>{children}</main>;
}
