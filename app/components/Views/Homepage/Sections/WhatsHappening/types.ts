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
  /** CAIP-19 IDs or symbols from `MarketOverviewTrend.relatedAssets` */
  relatedAssets: string[];
  articles: Article[];
}
