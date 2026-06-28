import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { MemoriaDock } from "@/components/ui/dock";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { SubscriptionProvider } from "@/lib/subscription";
import { WorkspaceProvider } from "@/lib/workspace";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
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
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <WorkspaceProvider>
                <main className="flex-1 min-w-0 pb-24">
                  {children}
                </main>
                <MemoriaDock />
              </WorkspaceProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
