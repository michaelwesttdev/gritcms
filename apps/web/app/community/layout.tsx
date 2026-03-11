import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community",
  description:
    "Join the conversation. Connect with fellow members, ask questions, and share ideas.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
