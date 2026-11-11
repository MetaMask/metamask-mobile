import { act } from '@testing-library/react-native';
import { useLiveCryptoPrice } from './useLiveCryptoPrice';
import Engine from '../../../../core/Engine';
import { CryptoPriceUpdate } from '../types';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  createMockAccountGroup,
  createMockInternalAccount,
  createMockState,
  createMockWallet,
} from '../../../../component-library/components-temp/MultichainAccounts/test-utils';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      subscribeToCryptoPrices: jest.fn(),
      getConnectionStatus: jest.fn(),
    },
  },
}));

const evmAccount = createMockInternalAccount(
  'account-1',
  '0x1234567890123456789012345678901234567890',
  'Account 1',
);
const mockState = createMockState(
  [
    createMockWallet('keyring:wallet-1', 'Wallet 1', [
      createMockAccountGroup('keyring:wallet-1/1', 'Account 1', [
        evmAccount.id,
      ]),
    ]),
  ],
  { [evmAccount.id]: evmAccount },
);

const renderHookWithAccount = <Result>(hook: () => Result) =>
  renderHookWithProvider(hook, { state: mockState });

describe('useLiveCryptoPrice', () => {
  const mockSubscribeToCryptoPrices = Engine.context.PredictController
    .subscribeToCryptoPrices as jest.Mock;
  const mockGetConnectionStatus = Engine.context.PredictController
    .getConnectionStatus as jest.Mock;
  const mockUnsubscribe = jest.fn();
  let capturedCallback: (update: CryptoPriceUpdate) => void = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockSubscribeToCryptoPrices.mockImplementation((_symbols, callback) => {
      capturedCallback = callback;
      return mockUnsubscribe;
    });
    mockGetConnectionStatus.mockReturnValue({
      rtdsConnected: true,
      sportsConnected: false,
      marketConnected: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const sendUpdate = (price: number, timestamp = Date.now()) => {
    act(() => {
      capturedCallback({ symbol: 'btc/usd', price, timestamp });
    });
  };

  it('subscribes to the lowercased ws symbol when enabled', () => {
    renderHookWithAccount(() =>
      useLiveCryptoPrice({ symbol: 'BTC', enabled: true }),
    );

    expect(mockSubscribeToCryptoPrices).toHaveBeenCalledWith(
      ['btc/usd'],
      expect.any(Function),
      { twapWindowSeconds: undefined },
    );
  });

  it('does not subscribe when disabled', () => {
    renderHookWithAccount(() =>
      useLiveCryptoPrice({ symbol: 'BTC', enabled: false }),
    );

    expect(mockSubscribeToCryptoPrices).not.toHaveBeenCalled();
  });

  it('does not subscribe when symbol is undefined', () => {
    renderHookWithAccount(() => useLiveCryptoPrice({ symbol: undefined }));

    expect(mockSubscribeToCryptoPrices).not.toHaveBeenCalled();
  });

  it('commits the first update immediately', () => {
    const { result } = renderHookWithAccount(() =>
      useLiveCryptoPrice({ symbol: 'BTC' }),
    );

    expect(result.current.value).toBeUndefined();

    sendUpdate(93000);

    expect(result.current.value).toBe(93000);
  });

  it('coalesces rapid ticks to at most one commit per updateIntervalMs', () => {
    const { result } = renderHookWithAccount(() =>
      useLiveCryptoPrice({ symbol: 'BTC', updateIntervalMs: 1000 }),
    );

    sendUpdate(93000);
    expect(result.current.value).toBe(93000);

    // Several ticks arrive within the same 1s window — none should commit
    // synchronously since the first tick just committed.
    sendUpdate(93010);
    sendUpdate(93020);
    sendUpdate(93030);
    expect(result.current.value).toBe(93000);

    // The trailing update fires once the interval elapses, applying the
    // latest pending price rather than every intermediate one.
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.value).toBe(93030);
  });

  it('commits immediately again once updateIntervalMs has elapsed', () => {
    const { result } = renderHookWithAccount(() =>
      useLiveCryptoPrice({ symbol: 'BTC', updateIntervalMs: 1000 }),
    );

    sendUpdate(93000);
    expect(result.current.value).toBe(93000);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    sendUpdate(93100);
    expect(result.current.value).toBe(93100);
  });

  it('does not build or expose any point-history array', () => {
    const { result } = renderHookWithAccount(() =>
      useLiveCryptoPrice({ symbol: 'BTC' }),
    );

    sendUpdate(93000);

    expect(result.current).toEqual({ value: 93000 });
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHookWithAccount(() =>
      useLiveCryptoPrice({ symbol: 'BTC' }),
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('passes the twap window through to the subscription', () => {
    renderHookWithAccount(() =>
      useLiveCryptoPrice({ symbol: 'BTC', twapWindowSeconds: 30 }),
    );

    expect(mockSubscribeToCryptoPrices).toHaveBeenCalledWith(
      ['btc/usd'],
      expect.any(Function),
      { twapWindowSeconds: 30 },
    );
  });

  it('passes the settlement provider through to the subscription', () => {
    renderHookWithAccount(() =>
      useLiveCryptoPrice({ symbol: 'BTC', provider: 'binance' }),
    );

    expect(mockSubscribeToCryptoPrices).toHaveBeenCalledWith(
      ['btc/usd'],
      expect.any(Function),
      { twapWindowSeconds: undefined, provider: 'binance' },
    );
  });
});
