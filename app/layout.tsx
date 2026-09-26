import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { connection } from "next/server";

import { PendingAlerts } from "@/components/admin/pending-alerts";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "Studio Las MK",
    template: "%s | Studio Las MK",
  },
  description: "Frizerski salon Studio Las MK v Gibini pri Ljutomeru.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();

  return (
    <html
      lang="sl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#vsebina"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-background focus:px-4 focus:py-2"
        >
          Preskoči na vsebino
        </a>
        <SiteHeader />
        <PendingAlerts />
        <div id="vsebina" className="flex flex-1 flex-col">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
