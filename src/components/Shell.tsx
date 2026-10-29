"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Package, Plus } from "lucide-react";
import { signOut } from "@/lib/auth";
import { isConfigured } from "@/lib/entries";
import { LOGIN_PATH } from "./AuthGate";
export default function Shell({ children }: { children: React.ReactNode }) {
 const router = useRouter();
 return <main className="site-shell"><header><Link className="brand" href="/store-ops"><span className="brand-mark">C</span><span><b>Cioffi&apos;s</b><small>STORE OPERATIONS</small></span></Link><nav><Link href="/store-ops"><LayoutDashboard size={17}/> Records</Link><Link href="/store-ops/products"><Package size={17}/> Products</Link><Link className="primary" href="/store-ops/new"><Plus size={17}/> New entry</Link>{isConfigured()&&<button className="nav-signout" onClick={async()=>{await signOut(); router.replace(LOGIN_PATH);}} title="Sign out"><LogOut size={17}/><span>Sign out</span></button>}</nav></header>{children}</main>;
}
