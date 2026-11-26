import type { PredictIntent } from '../navigation/entry';

/**
 * One Predict search result, in venue-neutral display values. A caller
 * renders it with `PredictSearchResultRow` and opens it by handing `intent`
 * to `openPredict`; it never reads a Venue, a provider or a market from it.
 */
export interface PredictSearchResult {
  /** Unique within one result set. A list key, not an identifier to parse. */
  readonly id: string;
  /** First line of the row. */
  readonly title: string;
  /** Second line of the row. */
  readonly subtitle: string;
  /** Leading image. Without one the row shows a placeholder icon. */
  readonly imageUrl?: string;
  /** What pressing the result opens. */
  readonly intent: PredictIntent;
}

/** Predict's results for one search query, in display order. */
export interface PredictSearchResults {
  results: PredictSearchResult[];
  /** True while the query is debouncing or its results are loading. */
  isLoading: boolean;
}
