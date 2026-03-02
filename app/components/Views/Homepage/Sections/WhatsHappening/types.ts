/**
 * Represents a single "What's Happening" trending item.
 */
export interface WhatsHappeningItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  date: string;
  relatedAssets: string[];
}
