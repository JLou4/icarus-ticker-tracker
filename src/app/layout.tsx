import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Icarus Ticker Tracker 🔥",
  description: "Track stock performance from the moment you mention them",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
