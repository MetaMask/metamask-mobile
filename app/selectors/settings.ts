import { RootState } from '../reducers';
import { createSelector } from 'reselect';
import { AvatarAccountType } from '../component-library/components/Avatars/Avatar/variants/AvatarAccount/AvatarAccount.types';
import { CandlePeriod } from '../components/UI/Perps/constants/chartConfig';

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
export const selectShowCustomNonce = createSelector(
  selectSettings,
  (settingsState: Record<string, unknown>) => settingsState.showCustomNonce,
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

export const selectPerpsChartPreferences = createSelector(
  selectSettings,
  (settingsState: Record<string, unknown>) => {
    const preferences = settingsState.perpsChartPreferences as
      | Record<string, unknown>
      | undefined;
    return {
      preferredCandlePeriod:
        (preferences?.preferredCandlePeriod as string) ?? '15m',
    };
  },
);

export const selectPerpsChartPreferredCandlePeriod = createSelector(
  selectPerpsChartPreferences,
  (preferences): CandlePeriod => {
    const period = preferences.preferredCandlePeriod;
    // Validate that the stored value is a valid CandlePeriod
    if (Object.values(CandlePeriod).includes(period as CandlePeriod)) {
      return period as CandlePeriod;
    }
    // Fallback to default if invalid
    return CandlePeriod.FIFTEEN_MINUTES;
  },
);
