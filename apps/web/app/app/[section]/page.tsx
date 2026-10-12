import Link from "next/link";
import { notFound } from "next/navigation";
import { appPages, isAppSection } from "../../../lib/navigation";
export default async function AppPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!isAppSection(section)) notFound();
  const page = appPages[section];
  return (
    <div className="page-context">
      <p>{page.description}</p>
      <Link href={`/app/${page.next}`}>
        Next: {appPages[page.next].title} ↗
      </Link>
    </div>
  );
}
