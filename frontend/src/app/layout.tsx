import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import MatrixRain from "@/components/console/MatrixRain";
import SolanaProviders from "@/components/solana/SolanaProviders";
import "./globals.css";

const mono = JetBrains_Mono({
  variable: "--font-matrix-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VAULT//MATRIX",
  description: "On-chain vault console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${mono.variable} antialiased`}>
        <MatrixRain />
        <SolanaProviders>{children}</SolanaProviders>
      </body>
    </html>
  );
}
