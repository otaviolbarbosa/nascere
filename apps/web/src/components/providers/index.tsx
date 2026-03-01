"use client";

import { ThemeProvider } from "./theme-provider";
import { AuthProvider } from "./auth-provider";
import { NotificationsProvider } from "./notifications-provider";
import { PwaProvider } from "./pwa-provider";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <NotificationsProvider>
          <PwaProvider>
            {children}
            <Toaster />
          </PwaProvider>
        </NotificationsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
