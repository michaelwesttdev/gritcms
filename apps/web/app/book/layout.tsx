import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Session",
  description:
    "Schedule a session at a time that works for you. Pick a date, choose a slot, and confirm.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
