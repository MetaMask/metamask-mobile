/**
 * Represents a single "What's Happening" trending item.
 */
export interface WhatsHappeningItem {
  id: string;
  title: string;
  description: string;
  date: string;
  category:
    | 'geopolitical'
    | 'macro'
    | 'regulatory'
    | 'technical'
    | 'social'
    | 'other';
  impact: 'positive' | 'negative' | 'neutral';
  relatedAssets: string[];
}
