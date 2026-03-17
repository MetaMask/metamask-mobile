/**
 * A related asset attached to a trend, including CAIP-19 identifiers and
 * display metadata. Matches the rich object shape returned by the
 * AiDigestController API (relatedAssets array inside each trend).
 */
export interface RelatedAsset {
  name: string;
  symbol: string;
  caip19: string[];
  sourceAssetId: string;
  hlPerpsMarket?: string;
}

/**
 * A news article linked to a trend.
 */
export interface Article {
  url: string;
  title: string;
  source: string;
  date: string;
}

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
  relatedAssets: RelatedAsset[];
  articles: Article[];
}
