export interface PremiumGuide {
  id: number;
  tenant_id: number;
  title: string;
  slug: string;
  description: string;
  cover_image: string;
  pdf_url: string;
  email_list_id: number;
  status: "draft" | "published";
  sort_order: number;
  download_count: number;
  view_count: number;
  email_list?: { id: number; name: string };
  created_at: string;
  updated_at: string;
}
