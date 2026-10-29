import type { Metadata, Viewport } from "next";
import "./globals.css";

// The tab and home-screen icons come from app/icon.png and app/apple-icon.png; the installed-app
// name and icons come from app/manifest.ts.
export const metadata: Metadata = {
  title: "Store Operations | Cioffi's",
  description: "Store ordering and inventory-cycle records.",
  applicationName: "SSM",
  appleWebApp: { capable: true, title: "SSM", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#1b5637" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
