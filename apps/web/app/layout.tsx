import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Confiance — bounded agent authority",
  description: "Give an AI agent a job without giving it your wallet.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
