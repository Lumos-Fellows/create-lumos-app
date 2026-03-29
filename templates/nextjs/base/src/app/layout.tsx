import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "./theme-provider";
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
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          {/* -- POSTHOG_START -- */}
          <PostHogProvider>
            {children}
          </PostHogProvider>
          {/* -- POSTHOG_END -- */}
          {/* -- NO_POSTHOG_START -- */}
          {children}
          {/* -- NO_POSTHOG_END -- */}
        </ThemeProvider>
      </body>
    </html>
  );
}
