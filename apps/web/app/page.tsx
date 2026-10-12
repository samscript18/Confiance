import Landing from "./landing";
import type { Metadata } from "next";
import { siteDescription, siteUrl } from "../lib/seo";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Page() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Confiance",
        url: siteUrl,
        logo: `${siteUrl}/logo.svg`,
      },
      {
        "@type": "WebSite",
        name: "Confiance",
        url: siteUrl,
        description: siteDescription,
        publisher: { "@id": `${siteUrl}/#organization` },
      },
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <Landing />
    </>
  );
}
