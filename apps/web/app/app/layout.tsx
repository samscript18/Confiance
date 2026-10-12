import Dashboard from "../dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workspace",
  robots: { index: false, follow: false, noarchive: true },
};
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Dashboard>{children}</Dashboard>;
}
