import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from './ClientLayout'
import PostHogProvider from './PostHogProvider'
import posthog from '../lib/posthog'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Duke DSP Alumni Directory",
  description: "Connect with Duke Data+ alumni and explore career opportunities in data science and analytics.",
  keywords: ["Duke", "Data+", "Alumni", "Directory", "Data Science", "Analytics"],
  authors: [{ name: "Duke Data+ Program" }],
  openGraph: {
    title: "Duke DSP Alumni Directory",
    description: "Connect with Duke Data+ alumni and explore career opportunities in data science and analytics.",
    url: "https://dukedsp.com",
    siteName: "Duke DSP Alumni Directory",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Duke DSP Alumni Directory",
    description: "Connect with Duke Data+ alumni and explore career opportunities in data science and analytics.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  posthog.capture('custom_event', { property: 'value' })
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PostHogProvider>
          <ClientLayout>{children}</ClientLayout>
        </PostHogProvider>
      </body>
    </html>
  );
}
