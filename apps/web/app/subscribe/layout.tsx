import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscribe",
  description:
    "Subscribe to our newsletter and stay up to date with the latest content.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
