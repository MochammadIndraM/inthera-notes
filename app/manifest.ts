import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "IntheraNotes",
    short_name: "IntheraNotes",
    description:
      "Rencanakan harimu. Pahami uangmu. Satu ruang pribadi untuk tugas dan keuangan.",
    lang: "id-ID",
    dir: "ltr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f8f9fc",
    theme_color: "#7559dc",
    categories: ["productivity", "finance"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Tugas hari ini",
        short_name: "Hari ini",
        url: "/tasks/today",
        description: "Lihat prioritas dan tenggat hari ini.",
      },
      {
        name: "Semua tugas",
        short_name: "Tugas",
        url: "/tasks",
        description: "Buka daftar tugas pribadimu.",
      },
      {
        name: "Keuangan",
        short_name: "Keuangan",
        url: "/finance",
        description: "Lihat saldo dan arus kasmu.",
      },
    ],
  };
}
