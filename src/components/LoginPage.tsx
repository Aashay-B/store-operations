"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { signIn } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { supabase?.auth.getSession().then(({ data }) => { if (data.session) router.replace("/store-ops"); }); }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { await signIn(username, password); router.replace("/store-ops"); }
    catch (err) {
      console.error("Sign-in failed:", err);
      setError((err as { code?: string })?.code === "invalid_credentials" ? "Incorrect username or password." : "Couldn’t sign in. Please check the connection and try again.");
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="login-logo" src="/logo.png" alt="Cioffi's Meat Market & Deli" />
        <div><b>Cioffi&apos;s Store Operations</b><small>STORE OPS</small></div>
      </div>
      <div className="login-hero">
        {supabase ? (
          <form className="login-card" onSubmit={submit}>
            <h1>Log in to Store Ops</h1>
            <label><span>Username</span><input required autoFocus autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(e) => setUsername(e.target.value)} /></label>
            <label><span>Password</span><input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="submit" disabled={busy}>{busy ? "Logging in…" : <><LogIn size={17} /> Log in</>}</button>
            <p className="login-help">Need an account? Ask a manager to set one up.</p>
          </form>
        ) : (
          <div className="login-card">
            <h1>Demo mode</h1>
            <p className="login-help">Sign-in is turned off until Supabase keys are added. <Link href="/store-ops">Go to the app</Link></p>
          </div>
        )}
      </div>
    </main>
  );
}
