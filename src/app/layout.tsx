import type { Metadata } from "next";
import "./globals.css";
import { brandAssets } from "@/frontend/lib/brand-assets";

export const metadata: Metadata = {
  title: "Mobile Car Detailing | Handiman",
  description: "Request convenient interior, exterior, or full car detailing and provide your preferred service location with Handiman.",
  icons: {
    icon: brandAssets.icon,
    apple: brandAssets.iconLarge,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
