import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { PwaProvider } from "@/components/pwa-provider";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "IntheraNotes — Rencanakan harimu. Pahami uangmu.",
    template: "%s | IntheraNotes",
  },
  description:
    "Workspace pribadi untuk tugas, rencana harian, dan keuangan dalam rupiah.",
  robots: { index: false, follow: false },
  applicationName: "IntheraNotes",
  appleWebApp: {
    capable: true,
    title: "IntheraNotes",
    statusBarStyle: "default",
  },
  icons: {
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#7559dc",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('inthera-theme')||'system';document.documentElement.dataset.theme=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <PwaProvider>
          {children}
          <Toaster richColors position="bottom-right" closeButton />
        </PwaProvider>
      </body>
    </html>
  );
}
