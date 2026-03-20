import type { Article } from '@metamask/ai-controllers';

/**
 * Represents a single "What's Happening" trending item.
 */
export interface WhatsHappeningItem {
  id: string;
  title: string;
  description: string;
  date: string;
  category?:
    | 'geopolitical'
    | 'macro'
    | 'regulatory'
    | 'technical'
    | 'social'
    | 'other';
  impact?: 'positive' | 'negative' | 'neutral';
  /** Short labels for carousel pills (from `RelatedAsset.symbol` / `name`) */
  relatedAssets: string[];
  articles: Article[];
}
