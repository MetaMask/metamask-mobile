export const SocialFiltersBottomSheetSelectorsIDs = {
  SHEET: 'social-filters-bottom-sheet',
  BACKDROP: 'social-filters-bottom-sheet-backdrop',
  CLOSE_BUTTON: 'social-filters-bottom-sheet-close-button',
  SHOW_RESULTS: 'social-filters-bottom-sheet-show-results',
} as const;

export const getFilterChipTestId = (section: string, id: string) =>
  `social-filters-${section}-${id}`;

export const getFilterRangeTestId = (section: string) =>
  `social-filters-${section}-slider`;
