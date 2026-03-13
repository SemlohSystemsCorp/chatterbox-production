import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  axes: ["opsz"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://georgeholmes.io";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),

  applicationName: "Chatterbox",

  title: {
    default: "Chatterbox — Fast, Clean Team Communication",
    template: "%s — Chatterbox",
  },

  description:
    "Chatterbox is a modern team messaging app with channels, threads, direct messages, file sharing, and video calls. The Slack alternative built for speed and clarity.",

  keywords: [
    "team messaging",
    "slack alternative",
    "team chat app",
    "business communication",
    "channels",
    "message threads",
    "direct messages",
    "video calls",
    "file sharing",
    "team collaboration",
    "workplace chat",
    "real-time messaging",
    "remote work tools",
    "productivity app",
    "group messaging",
    "team workspace",
    "internal communication",
    "async communication",
  ],

  authors: [{ name: "Chatterbox", url: baseUrl }],
  creator: "Chatterbox",
  publisher: "Chatterbox",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "Chatterbox",
    title: "Chatterbox — Fast, Clean Team Communication",
    description:
      "Modern team messaging with channels, threads, DMs, file sharing, and video calls. The Slack alternative built for speed and clarity.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Chatterbox — Fast, Clean Team Communication",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    site: "@chatterboxapp",
    creator: "@chatterboxapp",
    title: "Chatterbox — Fast, Clean Team Communication",
    description:
      "Modern team messaging with channels, threads, DMs, file sharing, and video calls.",
    images: [
      {
        url: "/opengraph-image",
        alt: "Chatterbox — Fast, Clean Team Communication",
      },
    ],
  },

  alternates: {
    canonical: baseUrl,
  },

  category: "productivity",

  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },

  manifest: "/manifest.webmanifest",

  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Chatterbox",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#635bff",
    "theme-color": "#635bff",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply saved theme before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('cb_theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}else{document.documentElement.removeAttribute('data-theme');localStorage.setItem('cb_theme','light');}}catch(e){}})();` }} />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
        <ServiceWorkerRegister />
        <Toaster
          position="top-right"
          toastOptions={{
            className: "!bg-background !text-foreground !border !border-border",
          }}
        />
      </body>
    </html>
  );
}
