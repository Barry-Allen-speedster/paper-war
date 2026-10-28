import type { Metadata, Viewport } from "next";
import "../styles/globals.css";
import { ThemeProvider } from "@components/ui/ThemeProvider";

export const metadata: Metadata = {
  title: "Paper War",
  description: "A two-player paper-folding battle game",
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
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
