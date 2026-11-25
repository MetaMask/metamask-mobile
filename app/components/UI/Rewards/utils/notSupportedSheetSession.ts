/**
 * Account group ids that have already had the "Account not supported" sheet
 * shown in this app session. Module state resets when the app restarts.
 */
const shownAccountGroupIds = new Set<string>();

export const hasShownNotSupportedSheet = (accountGroupId: string): boolean =>
  shownAccountGroupIds.has(accountGroupId);

export const markNotSupportedSheetShown = (accountGroupId: string): void => {
  shownAccountGroupIds.add(accountGroupId);
};

/** Clears session state. Intended for tests only. */
export const resetNotSupportedSheetSession = (): void => {
  shownAccountGroupIds.clear();
};
