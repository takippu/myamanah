import type { Metadata } from "next";
import { Geist, Geist_Mono, Manrope } from "next/font/google";
import "@fontsource/material-symbols-outlined";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope", // generic variable, though we use font-display in CSS
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AmanahVault",
  description: "Zero-Knowledge Digital Legacy Organizer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} ${manrope.className} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
