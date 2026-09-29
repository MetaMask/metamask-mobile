export const TypeFilterSelectorsIDs = {
  SELECTOR: 'type-filter-selector',
  SHEET: 'type-filter-sheet',
  BACKDROP: 'type-filter-backdrop',
} as const;

export const TimeframeFilterSelectorsIDs = {
  SELECTOR: 'timeframe-filter-selector',
  SHEET: 'timeframe-filter-sheet',
  BACKDROP: 'timeframe-filter-backdrop',
} as const;

export const SortFilterSelectorsIDs = {
  SELECTOR: 'sort-filter-selector',
  SHEET: 'sort-filter-sheet',
  BACKDROP: 'sort-filter-backdrop',
} as const;

export const FilterOptionSheetSelectorsIDs = {
  CLOSE_BUTTON: 'filter-option-sheet-close-button',
} as const;

export const CohortFilterSelectorsIDs = {
  SELECTOR: 'cohort-filter-selector',
  SHEET: 'cohort-filter-sheet',
  BACKDROP: 'cohort-filter-backdrop',
} as const;

export const RankingFilterSelectorsIDs = {
  SELECTOR: 'ranking-filter-selector',
  SHEET: 'ranking-filter-sheet',
  BACKDROP: 'ranking-filter-backdrop',
} as const;

export const getTypeFilterOptionTestId = (type: string) =>
  `type-filter-option-${type}`;

export const getTimeframeFilterOptionTestId = (timeframe: string) =>
  `timeframe-filter-option-${timeframe}`;

export const getSortFilterOptionTestId = (sort: string) =>
  `sort-filter-option-${sort}`;

export const getCohortFilterOptionTestId = (cohort: string) =>
  `cohort-filter-option-${cohort}`;

export const getRankingFilterOptionTestId = (ranking: string) =>
  `ranking-filter-option-${ranking}`;
