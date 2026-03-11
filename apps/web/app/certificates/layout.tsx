import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Certificate Verification",
  description: "Verify the authenticity of a course completion certificate.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
