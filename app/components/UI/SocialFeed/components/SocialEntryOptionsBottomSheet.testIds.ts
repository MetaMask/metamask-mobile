export const SocialEntryOptionsBottomSheetSelectorsIDs = {
  SHEET: 'social-entry-options-bottom-sheet',
  BACKDROP: 'social-entry-options-bottom-sheet-backdrop',
  CLOSE_BUTTON: 'social-entry-options-bottom-sheet-close-button',
  REPORT: 'social-entry-options-report',
  HIDE_POST: 'social-entry-options-hide-post',
  BLOCK_USER: 'social-entry-options-block-user',
  REPORT_REASON_SHEET: 'social-entry-report-reason-bottom-sheet',
  REPORT_REASON_CLOSE_BUTTON: 'social-entry-report-reason-close-button',
  REPORT_SUBMIT: 'social-entry-report-submit',
  IMPERSONATION_SUPPORT: 'social-impersonation-support-sheet',
  IMPERSONATION_SUPPORT_DESCRIPTION: 'social-impersonation-support-description',
  IMPERSONATION_SUPPORT_CONTACT: 'social-impersonation-support-contact',
} as const;

export const getSocialEntryReportReasonTestId = (reason: string) =>
  `social-entry-report-reason-${reason}`;

export const getSocialEntryOptionsTriggerTestId = (id: string) =>
  `social-entry-options-trigger-${id}`;
