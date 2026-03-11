import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Premium Guides",
  description:
    "In-depth PDF guides to help you level up. Subscribe to access exclusive content.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
