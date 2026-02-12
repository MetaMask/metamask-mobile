/**
 * Market Insights data types
 * Represents the AI-powered market analysis report for a crypto asset
 */

export interface MarketInsightsArticle {
  /** Article title */
  title: string;
  /** Full URL to the article */
  url: string;
  /** Source domain name */
  source: string;
  /** ISO date string */
  date: string;
}

export interface MarketInsightsTweet {
  /** Summary of the tweet content */
  contentSummary: string;
  /** Full URL to the tweet */
  url: string;
  /** Author handle (e.g., @saylordocs) */
  author: string;
  /** ISO date string */
  date: string;
}

export interface MarketInsightsTrend {
  /** Trend title (e.g., "Institutions Buying the Dip") */
  title: string;
  /** Detailed description of the trend */
  description: string;
  /** Category of the trend */
  category: 'macro' | 'technical' | 'social' | string;
  /** Impact direction */
  impact: 'positive' | 'negative' | 'neutral' | string;
  /** Related articles */
  articles: MarketInsightsArticle[];
  /** Related tweets */
  tweets: MarketInsightsTweet[];
}

export interface MarketInsightsSource {
  /** Source name */
  name: string;
  /** Source URL */
  url: string;
  /** Source type */
  type: 'news' | 'data' | 'social' | string;
}

export interface MarketInsightsReport {
  /** API version */
  version: string;
  /** Asset symbol (lowercase, e.g., "btc") */
  asset: string;
  /** ISO date string when the report was generated */
  generatedAt: string;
  /** Main headline */
  headline: string;
  /** Summary paragraph */
  summary: string;
  /** Key market trends */
  trends: MarketInsightsTrend[];
  /** Data sources used */
  sources: MarketInsightsSource[];
}
