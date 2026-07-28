export const TypeFilterSelectorsIDs = {
  SELECTOR: 'type-filter-selector',
  SHEET: 'type-filter-sheet',
  BACKDROP: 'type-filter-backdrop',
} as const;

export const getTypeFilterOptionTestId = (type: string) =>
  `type-filter-option-${type}`;
