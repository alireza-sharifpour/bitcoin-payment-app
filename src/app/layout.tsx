// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider"; // Import the QueryProvider
import { Toaster } from "@/components/ui/sonner"; // Import the Toaster

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bitcoin Testnet Payment App", // Updated title
  description: "Generate Bitcoin testnet payment requests and track their status.", // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Wrap the children with QueryProvider */}
        <QueryProvider>
          {children}
          {/* Add Toaster for global notifications */}
          {/* Ensure this is within QueryProvider if toasts need access to queryClient, though usually not */}
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
