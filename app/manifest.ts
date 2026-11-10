import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PreOrderKu",
    short_name: "PreOrderKu",
    description: "Pre-order sehari sebelum produksi untuk penjual makanan kampus.",
    start_url: "/",
    display: "standalone",
    background_color: "#F3EEE3",
    theme_color: "#F3EEE3",
    icons: [
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
