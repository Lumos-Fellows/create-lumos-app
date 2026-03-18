import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// -- POSTHOG_START --
import { PostHogProvider } from "./providers";
// -- POSTHOG_END --

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lumos App",
  description: "Built with create-lumos-app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {/* -- POSTHOG_START -- */}
        <PostHogProvider>
          {children}
        </PostHogProvider>
        {/* -- POSTHOG_END -- */}
        {/* -- NO_POSTHOG_START -- */}
        {children}
        {/* -- NO_POSTHOG_END -- */}
      </body>
    </html>
  );
}
