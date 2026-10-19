export const SocialFiltersBottomSheetSelectorsIDs = {
  SHEET: 'social-filters-bottom-sheet',
  BACKDROP: 'social-filters-bottom-sheet-backdrop',
  CLOSE_BUTTON: 'social-filters-bottom-sheet-close-button',
  APPLY: 'social-filters-bottom-sheet-apply',
  RESET: 'social-filters-bottom-sheet-reset',
  SHOW_RESULTS: 'social-filters-bottom-sheet-apply',
} as const;

export const getFilterChipTestId = (section: string, id: string) =>
  `social-filters-${section}-${id}`;

export const getFilterRangeTestId = (section: string) =>
  `social-filters-${section}-slider`;
