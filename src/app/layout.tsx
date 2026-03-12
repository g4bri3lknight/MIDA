import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/migration/auth-provider";

export const metadata: Metadata = {
  title: "MIDA - Migration Dashboard",
  description: "Dashboard per il monitoraggio delle migrazioni server",
  keywords: ["MIDA", "Migration", "Dashboard", "Server", "Monitoraggio"],
  authors: [{ name: "MIDA Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
