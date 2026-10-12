import type { Metadata } from "next";
import OwnerSetup from "./setup";

export const metadata: Metadata = {
  title: "Set up your live owner",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <OwnerSetup />;
}
