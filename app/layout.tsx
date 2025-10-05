import type { Metadata } from "next";
//import "./polyfills";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { configs } from "@/lib/constants";
import { BrowserCompatibilityProvider } from "@/components/browser-compatibility-provider";
import { OptimizationProvider } from "@/components/optimization-provider";

// Performance monitoring is imported dynamically in a client component to avoid SSR issues

export const metadata: Metadata = {
  title: `${configs.appName} - Buy Data, Airtime & Pay Bills`,
  description:
    "Buy data bundles, airtime, pay electricity bills and check exam results at the best prices. Fast delivery and 24/7 customer support.",
  applicationName: configs.appName,
  keywords:
    "data bundles, airtime topup, electricity bills, exam results, MTN data, Airtel data, Glo data, 9mobile data, utility payments, cheap data, bulk data, data subscription, airtime recharge, bill payments, WAEC result checker, NECO result checker, JAMB result checker, prepaid meter, postpaid meter, EKEDC, IKEDC, AEDC, PHEDC, mobile data, internet data plans, VTU services, utility bill payments, online recharge, data reseller, SME data plans, corporate data plans, instant recharge, automated payments, digital wallet, mobile wallet, online transactions, secure payments",
  authors: [{ name: "KINTA SME", url: "https://www.kinta-sme.com" }],
  creator: "KINTA SME",
  publisher: "KINTA SME",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://www.kinta-sme.com"),
  openGraph: {
    title: `${configs.appName} - Buy Data, Airtime & Pay Bills`,
    description:
      "Buy data bundles, airtime, pay electricity bills and check exam results at the best prices. Fast delivery and 24/7 customer support.",
    url: "https://www.kinta-sme.com",
    siteName: configs.appName,
    images: ["/og-image.jpg"],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${configs.appName} - Buy Data, Airtime & Pay Bills`,
    description:
      "Buy data bundles, airtime, pay electricity bills and check exam results at the best prices. Fast delivery and 24/7 customer support.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "google-site-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="text-[16px] md:text-[15px] sm:text-[14px]">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=5.0"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500&display=swap"
        />
      </head>
      <body className={`antialiased`}>
        <Toaster position="top-center" richColors />
        {/*<BrowserCompatibilityProvider>*/}
        {/*<OptimizationProvider>*/}

        {children}
        {/*</OptimizationProvider>*/}
        {/*</BrowserCompatibilityProvider>*/}
        <div id="browser-compatibility-container" />
      </body>
    </html>
  );
}
