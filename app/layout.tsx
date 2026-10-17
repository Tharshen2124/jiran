import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const metropolis = localFont({
  variable: "--font-metropolis",
  src: [
    { path: "./fonts/Metropolis-Medium.otf", weight: "500" },
    { path: "./fonts/Metropolis-SemiBold.otf", weight: "600" },
    { path: "./fonts/Metropolis-Bold.otf", weight: "700" },
    { path: "./fonts/Metropolis-ExtraBold.otf", weight: "800" },
  ],
});

export const metadata: Metadata = {
  title: "Jiran · City of Elmina",
  description: "Ask your neighbours for a hand, help back for points, and see the guards on patrol. A Sime Darby Property township app.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${metropolis.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
