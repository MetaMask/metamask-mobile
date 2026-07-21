import type { SocialAIPreference } from './useNotificationPreferences';

export type TradingSignalsChannelPreferences = Pick<
  SocialAIPreference,
  'pushNotificationsEnabled' | 'inAppNotificationsEnabled'
>;

/** True when neither push nor in-app trading-signal channels are enabled. */
export const areTradingSignalsChannelsDisabled = (
  preferences: TradingSignalsChannelPreferences,
): boolean =>
  !preferences.pushNotificationsEnabled &&
  !preferences.inAppNotificationsEnabled;

/** True when at least one trading-signal channel is enabled. */
export const areTradingSignalsChannelsEnabled = (
  preferences: TradingSignalsChannelPreferences,
): boolean => !areTradingSignalsChannelsDisabled(preferences);
