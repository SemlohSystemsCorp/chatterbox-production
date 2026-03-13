import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chatterbox",
    short_name: "Chatterbox",
    description:
      "Fast, clean team communication with channels, threads, DMs, and video.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#635bff",
    categories: ["productivity", "business", "communication"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
    screenshots: [],
  };
}
