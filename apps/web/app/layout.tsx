import type { Metadata } from "next";
import localFont from "next/font/local";
import { Poppins } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const poppinsSans = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Doulando - Gestão de Saúde para Gestantes",
  description: "Plataforma de gestão de saúde para profissionais de saúde acompanharem gestantes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${poppinsSans.variable} font-sans antialiased`}>
        {/* <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}> */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
