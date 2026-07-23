import type { Metadata } from "next";
import { CurrencyProvider } from "@/components/currency-provider";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

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
  openGraph: {
    title: "StitchLink",
    description: "Exceptional tailoring, without the distance.",
    images: ["/stitchlink-hero.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="flex min-h-full flex-col">
        <CurrencyProvider>{children}</CurrencyProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
