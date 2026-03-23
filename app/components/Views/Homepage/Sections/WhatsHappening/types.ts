import type { Article } from '@metamask/ai-controllers';

/**
 * An asset referenced by a trending topic.
 */
export interface RelatedAsset {
  sourceAssetId: string;
  symbol: string;
  name: string;
  caip19: string[];
}

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
}
