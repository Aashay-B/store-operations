"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export const LOGIN_PATH = "/store-ops/login";

// Keeps signed-out visitors on the login page. Without Supabase keys (demo mode) everything stays open.
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const open = !supabase || pathname === LOGIN_PATH;
  const [ready, setReady] = useState(open);

  useEffect(() => {
    if (!supabase || open) { setReady(true); return; }
    setReady(false);
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); else router.replace(LOGIN_PATH); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { if (!session) router.replace(LOGIN_PATH); });
    return () => data.subscription.unsubscribe();
  }, [open, router]);

  return ready ? children : null;
}
