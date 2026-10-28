import type { Metadata, Viewport } from "next";
import "../styles/globals.css";
import { ThemeProvider } from "@components/ui/ThemeProvider";

export const metadata: Metadata = {
  title: "Paper War",
  description: "A two-player paper-folding battle game. Place your army, aim your shot, fold the paper — ink presses through to the other side.",
  keywords: ["paper war", "board game", "strategy", "multiplayer", "browser game"],
  authors: [{ name: "Paper War" }],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.svg", sizes: "32x32", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Paper War",
    description: "A two-player paper-folding battle game. Aim your dot, fold the paper, press through.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Paper War",
    description: "A two-player paper-folding battle game.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* SVG favicon — works in all modern browsers */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate icon" href="/favicon-32.svg" />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
