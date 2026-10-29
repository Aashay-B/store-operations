import { supabase } from "./supabase";

// Supabase signs people in by email, so plain usernames map to an address on this placeholder domain.
// Create each user in Supabase as e.g. aashay@cioffis.local; a full email address also works here.
export const LOGIN_DOMAIN = "cioffis.local";
const toEmail = (username: string) => username.includes("@") ? username.trim() : `${username.trim().toLowerCase()}@${LOGIN_DOMAIN}`;

export async function signIn(username: string, password: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.auth.signInWithPassword({ email: toEmail(username), password });
  if (error) throw error;
}

export async function signOut() {
  await supabase?.auth.signOut();
}
