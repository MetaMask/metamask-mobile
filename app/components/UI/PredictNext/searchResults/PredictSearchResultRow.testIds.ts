export const PredictSearchResultRowTestIds = {
  /** The row; suffixed with the result id. */
  ROW: 'predict-search-result-row',
  IMAGE: 'predict-search-result-row-image',
  PLACEHOLDER_ICON: 'predict-search-result-row-placeholder-icon',
} as const;

export const getPredictSearchResultRowTestId = (resultId: string) =>
  `${PredictSearchResultRowTestIds.ROW}-${resultId}`;
