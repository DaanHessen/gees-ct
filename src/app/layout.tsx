import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { CocktailCacheProvider } from "@/lib/cocktail-cache";
import { AuthProvider } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/language-context";
import { MeasurementProvider } from "@/lib/measurement-context";
import { TeamProvider } from "@/lib/team-context";
import "./globals.css";

const gees = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-gees",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ctbase - Cocktail Recipe Platform",
  description: "Manage and explore cocktail recipes. A modern solution for organizing your cocktail recipes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
  }>) {
  return (
    <html lang="en">
      <body className={`${gees.variable} antialiased`}>
        <LanguageProvider>
          <MeasurementProvider>
            <AuthProvider>
              <TeamProvider>
                <CocktailCacheProvider>
                  {children}
                </CocktailCacheProvider>
              </TeamProvider>
            </AuthProvider>
          </MeasurementProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
