import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Tranche — Save in tranches",
  description: "Non-custodial testnet savings powered by Paiflow",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anonymous+Pro:wght@700&family=Chivo:wght@500&family=Cormorant+Garamond:wght@500&family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;500;600&family=Roboto+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
