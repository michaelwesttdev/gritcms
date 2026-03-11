import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Learn at your own pace with comprehensive courses designed to help you grow.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
