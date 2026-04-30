import { RootState } from '../reducers';
import { createSelector } from 'reselect';
import { AvatarAccountType } from '../component-library/components/Avatars/Avatar/variants/AvatarAccount/AvatarAccount.types';

const selectSettings = (state: RootState) => state.settings;

export const selectShowFiatInTestnets = createSelector(
  selectSettings,
  (settingsState: Record<string, unknown>) =>
    settingsState.showFiatOnTestnets as boolean,
);

export const selectPrimaryCurrency = createSelector(
  selectSettings,
  (settingsState: Record<string, unknown>) => settingsState.primaryCurrency,
);

export const selectBasicFunctionalityEnabled = createSelector(
  selectSettings,
  (settingsState: Record<string, unknown>) =>
    settingsState.basicFunctionalityEnabled as boolean,
);

export const selectHideZeroBalanceTokens = createSelector(
  selectSettings,
  (settingsState: Record<string, unknown>) =>
    Boolean(settingsState.hideZeroBalanceTokens),
);

export const selectDeepLinkModalDisabled = createSelector(
  selectSettings,
  (settingsState: Record<string, unknown>) =>
    Boolean(settingsState.deepLinkModalDisabled),
);

export const selectAvatarAccountType = createSelector(
  selectSettings,
  (settingsState: Record<string, unknown>) =>
    (settingsState.avatarAccountType as AvatarAccountType) ??
    AvatarAccountType.Maskicon,
);
