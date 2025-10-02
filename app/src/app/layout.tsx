import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// export const metadata: Metadata = {
//   title: "SC2006 Assignment",
//   description: "SC2006 Assignment",
//   applicationName: "FTools",
//   keywords: ["ftools", "tools", "free", "no sign-ups", "no limits"],
//   twitter: {
//     title: "FTools",
//     description: "No forced sign-ups, no arbitrary limits, just tools.",
//     card: "summary_large_image",
//     site: "@fstars",
//     creator: "@acrylic125",
//     images: "/thumbnail.png",
//   },
//   openGraph: {
//     title: "FTools",
//     description: "No forced sign-ups, no arbitrary limits, just tools.",
//     locale: "en_US",
//     type: "website",
//     images: [
//       {
//         url: "/thumbnail.png",
//         width: 256,
//         height: 256,
//         alt: "FTools Thumbnail",
//       },
//     ],
//   },
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Providers
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </Providers>
    </html>
  );
}
