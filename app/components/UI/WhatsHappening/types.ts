import type { Article, RelatedAsset } from '@metamask/ai-controllers';

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
  relatedAssets: RelatedAsset[];
  articles: Article[];
  /**
   * When true, this item was fetched by id from the front-page endpoint (an
   * older item no longer in the latest market overview) and is rendered first
   * in the carousel with an "Outdated" label.
   */
  isOutdated?: boolean;
}
