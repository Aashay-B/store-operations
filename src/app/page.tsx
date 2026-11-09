import { redirect } from "next/navigation";

// Send visitors to the sign-in flow instead of showing a 404 at the site root.
// LoginPage forwards an existing authenticated session to /store-ops.
export default function RootPage() { redirect("/store-ops/login"); }
