import { AppShell } from "@/components/app-shell";
import { getWorkspace } from "@/lib/queries";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspace = await getWorkspace();
  return <AppShell workspace={workspace}>{children}</AppShell>;
}
