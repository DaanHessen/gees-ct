import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { CocktailCacheProvider } from "@/lib/cocktail-cache";
import "./globals.css";

const gees = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-gees",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Cocktailbeheer",
  description: "Beheer en raadpleeg cocktailrecepten voor de bediening.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
  }>) {
  return (
    <html lang="en">
      <body className={`${gees.variable} antialiased`}>
        <CocktailCacheProvider>{children}</CocktailCacheProvider>
      </body>
    </html>
  );
}
