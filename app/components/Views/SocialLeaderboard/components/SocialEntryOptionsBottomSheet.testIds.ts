export const SocialEntryOptionsBottomSheetSelectorsIDs = {
  SHEET: 'social-entry-options-bottom-sheet',
  BACKDROP: 'social-entry-options-bottom-sheet-backdrop',
  CLOSE_BUTTON: 'social-entry-options-bottom-sheet-close-button',
  REPORT: 'social-entry-options-report',
} as const;

export const getSocialEntryOptionsTriggerTestId = (id: string) =>
  `social-entry-options-trigger-${id}`;
