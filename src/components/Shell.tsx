"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, Package, PackageCheck, Plus, ScanLine, X } from "lucide-react";
import { signOut } from "@/lib/auth";
import { isConfigured } from "@/lib/entries";
import { LOGIN_PATH } from "./AuthGate";

const pages = [
 { href: "/store-ops", label: "Dashboard", icon: LayoutDashboard },
 { href: "/store-ops/new", label: "Create an entry", icon: Plus },
 { href: "/store-ops/orders", label: "Order requests", icon: PackageCheck },
 { href: "/store-ops/inventory", label: "Received inventory", icon: ScanLine },
 { href: "/store-ops/products", label: "Products", icon: Package },
];

export default function Shell({ children }: { children: React.ReactNode }) {
 const router = useRouter(); const pathname = usePathname(); const [menuOpen,setMenuOpen]=useState(false);
 const logOut=async()=>{ setMenuOpen(false); await signOut(); router.replace(LOGIN_PATH); };
 useEffect(()=>{ if(!menuOpen) return; const onKey=(e:KeyboardEvent)=>{ if(e.key==="Escape") setMenuOpen(false); }; window.addEventListener("keydown",onKey); return ()=>window.removeEventListener("keydown",onKey); },[menuOpen]);
 return <main className="site-shell with-photo"><header><Link className="brand" href="/store-ops"><img className="brand-logo" src="/logo.png" alt="Cioffi's Meat Market & Deli"/><span><b>Store Operations</b><small>CIOFFI&apos;S</small></span></Link><nav><Link href="/store-ops"><LayoutDashboard size={17}/> Records</Link><Link href="/store-ops/products"><Package size={17}/> Products</Link>{isConfigured()&&<button className="nav-signout" onClick={logOut} title="Sign out"><LogOut size={17}/><span>Sign out</span></button>}</nav><button className="menu-btn" onClick={()=>setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}><Menu size={22}/></button></header>
  {menuOpen&&<div className="drawer-backdrop" onClick={()=>setMenuOpen(false)}><aside className="drawer" role="dialog" aria-modal="true" aria-label="Menu" onClick={e=>e.stopPropagation()}>
   <div className="drawer-head"><b>Menu</b><button className="scanner-close" onClick={()=>setMenuOpen(false)} aria-label="Close menu"><X size={20}/></button></div>
   <div className="drawer-links">{pages.map(({href,label,icon:Icon})=><Link key={href} href={href} className={pathname===href?"active":""} aria-current={pathname===href?"page":undefined} onClick={()=>setMenuOpen(false)}><Icon size={18}/> {label}</Link>)}</div>
   {isConfigured()&&<button className="drawer-signout" onClick={logOut}><LogOut size={18}/> Sign out</button>}
  </aside></div>}
  {children}</main>;
}
