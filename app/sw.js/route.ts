import { createServiceWorker } from "@/lib/pwa/service-worker";

export const dynamic = "force-static";

export function GET() {
  // Vercel supplies a new revision for each commit; local builds use this baseline.
  const revision = process.env.VERCEL_GIT_COMMIT_SHA || "2026-10-29-v1";
  return new Response(createServiceWorker(revision), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
