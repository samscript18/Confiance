import Dashboard from "../dashboard";
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Dashboard>{children}</Dashboard>;
}
