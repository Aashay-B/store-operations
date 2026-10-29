import type { MetadataRoute } from "next";

// Used when the site is installed or added to a home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SSM",
    short_name: "SSM",
    description: "Cioffi's store stock management: order requests, inventory counts and expiry tracking.",
    start_url: "/store-ops",
    scope: "/",
    display: "standalone",
    background_color: "#f4f2ea",
    theme_color: "#1b5637",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
