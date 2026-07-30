import type { Metadata } from "next";
import { headers } from "next/headers";
import { CurrencyProvider } from "@/components/currency-provider";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "StitchLink — Made for you, by Nigeria's finest tailors",
    template: "%s | StitchLink",
  },
  description:
    "Discover verified Nigerian tailors, commission custom pieces, share measurements securely, and follow every stitch.",
  applicationName: "StitchLink",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon-192.png", type: "image/png", sizes: "192x192" }, { url: "/icon-512.png", type: "image/png", sizes: "512x512" }],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    title: "StitchLink",
    description: "Exceptional tailoring, without the distance.",
    type: "website",
    siteName: "StitchLink",
    images: [{ url: "/stitchlink-mark.png", width: 1254, height: 1254, alt: "StitchLink needle and thread monogram" }],
  },
  twitter: { card: "summary", title: "StitchLink", description: "Exceptional tailoring, without the distance.", images: ["/stitchlink-mark.png"] },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: "(function(){try{var theme=localStorage.getItem('stitchlink-theme');if(theme==='dark'||theme==='light')document.documentElement.dataset.theme=theme;}catch(error){}})()",
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <CurrencyProvider>{children}</CurrencyProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
