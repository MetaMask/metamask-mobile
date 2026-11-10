/**
 * Integration test — order form "available to trade" from the real
 * PerpsController → HyperLiquidProvider chain into Mobile's shared stream
 * channel. Only the websocket subscription service (I/O) is mocked; Engine,
 * the connection manager and account lookup are app glue shims.
 */

// The harness installs the controller boundary mocks before the controller
// entrypoint is evaluated.
import { buildPerpsControllerHarness } from '../../../../../tests/integration/harnesses/perps/perps';
import type { PerpsController } from '@metamask/perps-controller';
import type { ActiveAssetDataWsEvent } from '@nktkas/hyperliquid';
import { PerpsStreamManager } from '../providers/PerpsStreamManager';

let mockController: PerpsController | null = null;
const mockAccount = { address: '0xabc', type: 'eip155:eoa' };

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      get PerpsController() {
        return mockController;
      },
      AccountTreeController: {
        getAccountsFromSelectedAccountGroup: () => [mockAccount],
      },
    },
  },
}));
jest.mock('../services/PerpsConnectionManager', () => ({
  __esModule: true,
  default: {
    getConnectionState: () => ({ isInitialized: true, isConnecting: false }),
  },
  PerpsConnectionManager: {
    getConnectionState: () => ({ isInitialized: true, isConnecting: false }),
  },
}));
jest.mock('../../../../store', () => ({
  store: { getState: jest.fn(() => ({})) },
}));

/** A venue `activeAssetData` event carrying the long and short values. */
const venueEvent = (long: string, short: string): ActiveAssetDataWsEvent => ({
  user: '0x0000000000000000000000000000000000000abc',
  coin: 'BTC',
  leverage: { type: 'cross', value: 10 },
  maxTradeSzs: ['0', '1'],
  availableToTrade: [long, short],
  markPx: '50000',
});

describe('Perps available to trade — integration', () => {
  let subscription: ReturnType<
    typeof buildPerpsControllerHarness
  >['subscription'];
  let streamManager: PerpsStreamManager;

  const lastVenueSubscription = () => {
    const { calls } = subscription.subscribeToActiveAssetData.mock;
    return calls[calls.length - 1][0];
  };

  beforeEach(async () => {
    const harness = buildPerpsControllerHarness();
    subscription = harness.subscription;
    mockController = harness.controller;
    await harness.controller.init();
    streamManager = new PerpsStreamManager();
  });

  afterEach(async () => {
    await mockController?.disconnect();
    mockController = null;
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

  it('resets to unknown on an account reconnect and streams the new account value', () => {
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
