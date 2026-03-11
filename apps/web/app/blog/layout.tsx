import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights, tutorials, and updates. Stay informed with our latest articles.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
