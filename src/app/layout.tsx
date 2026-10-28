import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Store Operations | Cioffi's",
  description: "Store ordering and inventory-cycle records."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
