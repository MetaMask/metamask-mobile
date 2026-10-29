import type { RootState } from '../reducers';

export const selectShouldShowConsentSheet = (state: RootState) =>
  state.security?.shouldShowConsentSheet ?? true;

export const selectDataSharingPreference = (state: RootState) =>
  state.security?.dataSharingPreference ?? null;

/**
 * Returns the saved support data sharing choice, or `null` when the consent
 * sheet should still be shown (the user never saved a choice, or turned off
 * "Remember my support preference" in Settings).
 */
export const selectSavedSupportDataSharingPreference = (
  state: RootState,
): boolean | null => {
  if (selectShouldShowConsentSheet(state)) {
    return null;
  }
  return selectDataSharingPreference(state);
};
