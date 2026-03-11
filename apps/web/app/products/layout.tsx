import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Browse our collection of digital products, courses, and memberships.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
