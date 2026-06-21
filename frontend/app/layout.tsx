import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MemoriaDock } from "@/components/ui/dock";
import { AuthProvider } from "@/components/auth/auth-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Memoria AI",
  description: "AI-powered note taking with memory",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#09090b] text-zinc-100">
        <AuthProvider>
          <main className="flex-1 pb-28">{children}</main>
          <MemoriaDock />
        </AuthProvider>
      </body>
    </html>
  );
}
