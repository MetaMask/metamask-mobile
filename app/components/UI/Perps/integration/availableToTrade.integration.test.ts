/**
 * Integration test — order form "available to trade" from the real
 * PerpsController → HyperLiquidProvider chain into Mobile's shared stream
 * channel. Only the websocket subscription service (I/O) is mocked; the stream
 * harness owns the Engine binding, the connection manager state and the store.
 */

// The harness installs the controller boundary and app-shell mocks before the
// controller entrypoint and Engine are evaluated.
import {
  buildPerpsStreamHarness,
  resetPerpsStreamHarness,
  type PerpsStreamHarness,
} from '../../../../../tests/integration/harnesses/perps/perps-stream';
import type { ActiveAssetDataWsEvent } from '@nktkas/hyperliquid';
import { PerpsStreamManager } from '../providers/PerpsStreamManager';

const ACCOUNT_A: `0x${string}` = '0x0000000000000000000000000000000000000abc';
const ACCOUNT_B: `0x${string}` = '0x0000000000000000000000000000000000000def';

/** A venue `activeAssetData` event carrying the long and short values. */
const venueEvent = (
  long: string,
  short: string,
  user: `0x${string}` = ACCOUNT_A,
): ActiveAssetDataWsEvent => ({
  user,
  coin: 'BTC',
  leverage: { type: 'cross', value: 10 },
  maxTradeSzs: ['0', '1'],
  availableToTrade: [long, short],
  markPx: '50000',
});

describe('Perps available to trade — integration', () => {
  let harness: PerpsStreamHarness;
  let subscription: PerpsStreamHarness['subscription'];
  let streamManager: PerpsStreamManager;

  const lastVenueSubscription = () => {
    const { calls } = subscription.subscribeToActiveAssetData.mock;
    return calls[calls.length - 1][0];
  };

  beforeEach(async () => {
    harness = await buildPerpsStreamHarness();
    harness.selectAccount(ACCOUNT_A);
    subscription = harness.subscription;
    streamManager = new PerpsStreamManager();
  });

  afterEach(async () => {
    await resetPerpsStreamHarness();
  });

  it('delivers long and short values for the subscribed market, including zero', () => {
    // Arrange
    const callback = jest.fn();
    streamManager.availableToTrade.subscribeToMarket({
      symbol: 'BTC',
      providerId: 'hyperliquid',
      callback,
      throttleMs: 0,
    });

    // Act
    lastVenueSubscription().callback(venueEvent('8.65', '0'));

    // Assert
    expect(lastVenueSubscription().symbol).toBe('BTC');
    expect(callback).toHaveBeenLastCalledWith({
      providerId: 'hyperliquid',
      symbol: 'BTC',
      long: '8.65',
      short: '0',
    });
  });

  it('stays unknown until the venue reports a value', () => {
    // Arrange
    const callback = jest.fn();

    // Act
    streamManager.availableToTrade.subscribeToMarket({
      symbol: 'BTC',
      providerId: 'hyperliquid',
      callback,
    });

    // Assert
    expect(subscription.subscribeToActiveAssetData).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalled();
    expect(streamManager.availableToTrade.getSnapshot()).toBeNull();
  });

  it('resets to unknown on a channel reset and ignores the retired subscription', () => {
    // Arrange
    const callback = jest.fn();
    streamManager.availableToTrade.subscribeToMarket({
      symbol: 'BTC',
      providerId: 'hyperliquid',
      callback,
      throttleMs: 0,
    });
    const firstVenueSubscription = lastVenueSubscription();
    firstVenueSubscription.callback(venueEvent('8.65', '9.65'));
    const venueUnsubscribe =
      subscription.subscribeToActiveAssetData.mock.results[0].value;

    // Act
    streamManager.availableToTrade.clearCache();
    streamManager.availableToTrade.reconnect();
    const valueBeforeNextDelivery =
      callback.mock.calls[callback.mock.calls.length - 1][0];
    firstVenueSubscription.callback(venueEvent('1', '1'));
    lastVenueSubscription().callback(venueEvent('2', '3'));

    // Assert
    expect(venueUnsubscribe).toHaveBeenCalled();
    expect(subscription.subscribeToActiveAssetData).toHaveBeenCalledTimes(2);
    expect(valueBeforeNextDelivery).toBeUndefined();
    expect(callback).not.toHaveBeenCalledWith(
      expect.objectContaining({ long: '1' }),
    );
    expect(callback).toHaveBeenLastCalledWith(
      expect.objectContaining({ long: '2', short: '3' }),
    );
  });

  it('switches account A to B: drops A frames, stays unknown, then shows B', async () => {
    // Arrange
    const callback = jest.fn();
    streamManager.availableToTrade.subscribeToMarket({
      symbol: 'BTC',
      providerId: 'hyperliquid',
      callback,
      throttleMs: 0,
    });
    const accountAVenue = lastVenueSubscription();
    accountAVenue.callback(venueEvent('8.65', '9.65', ACCOUNT_A));
    const accountAValue =
      callback.mock.calls[callback.mock.calls.length - 1][0];

    // Act: the selected account changes, and an A frame lands before the
    // connection manager reconnects.
    harness.selectAccount(ACCOUNT_B);
    accountAVenue.callback(venueEvent('1', '1', ACCOUNT_A));
    const callsAfterLateAFrame = callback.mock.calls.length;
    // The manager's reconnect: clear user-scoped channels, re-initialize the
    // controller for the new account, then resubscribe the channels.
    streamManager.availableToTrade.clearCache();
    await harness.controller.disconnect();
    await harness.controller.init();
    streamManager.availableToTrade.reconnect();
    const valueBeforeB = callback.mock.calls[callback.mock.calls.length - 1][0];
    const accountBVenue = lastVenueSubscription();
    accountBVenue.callback(venueEvent('2', '3', ACCOUNT_B));

    // Assert
    expect(accountAValue).toStrictEqual(
      expect.objectContaining({ long: '8.65', short: '9.65' }),
    );
    expect(callsAfterLateAFrame).toBe(1);
    expect(valueBeforeB).toBeUndefined();
    expect(accountBVenue).not.toBe(accountAVenue);
    expect(callback).not.toHaveBeenCalledWith(
      expect.objectContaining({ long: '1' }),
    );
    expect(callback).toHaveBeenLastCalledWith(
      expect.objectContaining({ long: '2', short: '3' }),
    );
  });

  it('reports a venue failure and recovers on the next value', () => {
    // Arrange
    const callback = jest.fn();
    const onError = jest.fn();
    streamManager.availableToTrade.subscribeToMarket({
      symbol: 'BTC',
      providerId: 'hyperliquid',
      callback,
      onError,
      throttleMs: 0,
    });
    const venue = lastVenueSubscription();
    venue.callback(venueEvent('8.65', '9.65'));
    const failure = new Error('activeAssetData closed');

    // Act
    venue.onError?.(failure);
    const snapshotAfterFailure = streamManager.availableToTrade.getSnapshot();
    venue.callback(venueEvent('4', '5'));

    // Assert
    expect(onError).toHaveBeenCalledWith(failure);
    expect(snapshotAfterFailure).toBeNull();
    expect(streamManager.availableToTrade.getError()).toBeNull();
    expect(callback).toHaveBeenLastCalledWith(
      expect.objectContaining({ long: '4', short: '5' }),
    );
  });
});
