import AuthGate from "@/components/AuthGate";
export default function StoreOpsLayout({ children }: { children: React.ReactNode }) { return <AuthGate>{children}</AuthGate>; }
