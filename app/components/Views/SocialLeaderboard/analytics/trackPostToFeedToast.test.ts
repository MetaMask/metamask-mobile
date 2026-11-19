import { trackPostToFeedToast } from './trackPostToFeedToast';
const mockTrackEvent = jest.fn();
const mockIsSocialV1Enabled = jest.fn(() => true);

jest.mock('react-native-device-info', () => ({
  getVersion: () => '7.57.0',
}));
jest.mock('../../../../store', () => ({
  store: { getState: () => ({}) },
}));
jest.mock('../../../../selectors/featureFlagController/socialV1', () => ({
  selectIsSocialV1Enabled: () => mockIsSocialV1Enabled(),
}));
jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: { trackEvent: (...args: unknown[]) => mockTrackEvent(...args) },
}));
describe('trackPostToFeedToast', () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
    mockIsSocialV1Enabled.mockReturnValue(true);
  });
  it('tracks the toast tap with the share id and composer entry', () => {
    trackPostToFeedToast({
      composerEntry: 'post_trade_spot',
      source: 'trader_feed',
      shareId: 'share:0xhash',
      transactionHash: '0xhash',
    });
    expect(mockTrackEvent.mock.calls[0][0]).toMatchObject({
      name: 'Social UI Interaction',
      properties: {
        interaction_type: 'tap',
        screen_name: 'post_to_feed_toast',
        composer_entry: 'post_trade_spot',
        share_id: 'share:0xhash',
        source: 'trader_feed',
        transaction_hash: '0xhash',
        app_build: '7.57.0-test',
      },
    });
  });
  it('does nothing when the flag state is unavailable', () => {
    mockIsSocialV1Enabled.mockImplementation(() => {
      throw new Error('missing engine');
    });
    expect(() =>
      trackPostToFeedToast({
        composerEntry: 'post_trade_spot',
        shareId: 'share:0xhash',
      }),
    ).not.toThrow();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
  it('does nothing when Social V1 is off', () => {
    mockIsSocialV1Enabled.mockReturnValue(false);
    trackPostToFeedToast({
      composerEntry: 'post_trade_perps',
      shareId: 'share:42',
      orderId: '42',
    });
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
