import { RootState } from '../reducers';
import { createSelector } from 'reselect';

const selectSecurity = (state: RootState) => state.security;

export const selectShouldShowConsentSheet = createSelector(
  [selectSecurity],
  (security) => security.shouldShowConsentSheet,
);

export const selectDataSharingPreference = createSelector(
  [selectSecurity],
  (security) => security.dataSharingPreference,
);

export const selectDataCollectionForMarketing = createSelector(
  [selectSecurity],
  (security) => security.dataCollectionForMarketing,
);
