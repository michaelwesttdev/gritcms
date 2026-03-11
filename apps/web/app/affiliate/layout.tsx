import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Affiliate Program",
  description:
    "Earn commissions by sharing products and courses with your audience.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
