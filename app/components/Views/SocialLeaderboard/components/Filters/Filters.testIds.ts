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

export const getTypeFilterOptionTestId = (type: string) =>
  `type-filter-option-${type}`;

export const getTimeframeFilterOptionTestId = (timeframe: string) =>
  `timeframe-filter-option-${timeframe}`;

export const getSortFilterOptionTestId = (sort: string) =>
  `sort-filter-option-${sort}`;
