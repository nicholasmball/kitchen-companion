import type { Metadata, Viewport } from "next";
import { Nunito, DM_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { PWARegister } from "@/components/pwa-register";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmMono = DM_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://catskitchen.co.uk'

export const viewport: Viewport = {
  themeColor: '#D97B4A',
}

export const metadata: Metadata = {
  title: "Cat's Kitchen",
  description: "Plan your meals, time your dishes, and get AI-powered cooking assistance.",
  metadataBase: new URL(siteUrl),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "Cat's Kitchen",
  },
  icons: {
    apple: '/icons/icon-192x192.png',
  },
  openGraph: {
    title: "Cat's Kitchen",
    description: "Plan your meals, time your dishes, and get AI-powered cooking assistance.",
    url: siteUrl,
    siteName: "Cat's Kitchen",
    locale: "en_GB",
    type: "website",
    images: [
      {
        url: "/images/branding/mascot circle.png",
        width: 512,
        height: 512,
        alt: "Cat's Kitchen mascot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cat's Kitchen",
    description: "Plan your meals, time your dishes, and get AI-powered cooking assistance.",
    images: ["/images/branding/mascot circle.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${nunito.variable} ${dmMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" />
          <PWARegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
