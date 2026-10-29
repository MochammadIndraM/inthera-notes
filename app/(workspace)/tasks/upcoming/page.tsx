import { TaskPage } from "@/components/pages/task-page";
import type { SearchParams } from "@/lib/types";
export const metadata = { title: "Mendatang" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return <TaskPage params={await searchParams} view="upcoming" />;
}
