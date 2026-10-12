import type { Metadata } from "next";
import { siteDescription, siteUrl } from "../lib/seo";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Confiance — Onchain authority for AI agents",
    template: "%s | Confiance",
  },
  description: siteDescription,
  applicationName: "Confiance",
  openGraph: {
    type: "website",
    siteName: "Confiance",
    title: "Confiance — Give an AI agent a job. Keep control of your money.",
    description: siteDescription,
    locale: "en_US",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Confiance — Onchain authority for AI agents",
    description: siteDescription,
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
