import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Референт",
  description: "AI-помощник для анализа иностранных статей и писем",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
