const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function fetchAPI<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as T;
  } catch {
    return null;
  }
}

export function ogImage(url?: string) {
  if (!url) return [];
  return [{ url, width: 1200, height: 630 }];
}
