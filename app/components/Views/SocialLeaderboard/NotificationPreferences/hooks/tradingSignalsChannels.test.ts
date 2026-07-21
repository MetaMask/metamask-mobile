import {
  areTradingSignalsChannelsDisabled,
  areTradingSignalsChannelsEnabled,
} from './tradingSignalsChannels';

describe('tradingSignalsChannels', () => {
  it('treats channels as disabled only when push and in-app are both off', () => {
    expect(
      areTradingSignalsChannelsDisabled({
        pushNotificationsEnabled: false,
        inAppNotificationsEnabled: true,
      }),
    ).toBe(false);
    expect(
      areTradingSignalsChannelsDisabled({
        pushNotificationsEnabled: true,
        inAppNotificationsEnabled: false,
      }),
    ).toBe(false);
    expect(
      areTradingSignalsChannelsDisabled({
        pushNotificationsEnabled: false,
        inAppNotificationsEnabled: false,
      }),
    ).toBe(true);
  });

  it('treats channels as enabled when either push or in-app is on', () => {
    expect(
      areTradingSignalsChannelsEnabled({
        pushNotificationsEnabled: false,
        inAppNotificationsEnabled: true,
      }),
    ).toBe(true);
    expect(
      areTradingSignalsChannelsEnabled({
        pushNotificationsEnabled: true,
        inAppNotificationsEnabled: false,
      }),
    ).toBe(true);
    expect(
      areTradingSignalsChannelsEnabled({
        pushNotificationsEnabled: false,
        inAppNotificationsEnabled: false,
      }),
    ).toBe(false);
  });
});
