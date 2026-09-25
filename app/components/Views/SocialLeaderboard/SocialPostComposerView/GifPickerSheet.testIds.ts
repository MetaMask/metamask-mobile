export const GifPickerSheetSelectorsIDs = {
  SHEET: 'social-post-composer-gif-sheet',
  CLOSE_BUTTON: 'social-post-composer-gif-sheet-close',
  SEARCH_INPUT: 'social-post-composer-gif-search',
  LIST: 'social-post-composer-gif-list',
  EMPTY: 'social-post-composer-gif-empty',
  ERROR: 'social-post-composer-gif-error',
  RETRY: 'social-post-composer-gif-retry',
  item: (id: string) => `social-post-composer-gif-item-${id}`,
} as const;
