import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Nexus — One Workspace. Every AI.",
  description:
    "Connect, compare, and use multiple AI models — OpenAI, Gemini, Claude, DeepSeek, Groq, Mistral, Qwen and more — from one intelligent workspace.",
  keywords: ["AI workspace", "multi-AI", "OpenAI", "Gemini", "Claude", "DeepSeek", "BYOK", "AI comparison"],
  authors: [{ name: "AI Nexus" }],
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "AI Nexus — One Workspace. Every AI.",
    description: "Connect, compare, and use multiple AI models from one intelligent workspace.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
