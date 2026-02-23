import { renderHook, act } from '@testing-library/react-native';
import { useBalanceRefresh } from './useBalanceRefresh';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector()),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(() => ({
    '0x1': {
      defaultRpcEndpointIndex: 0,
      rpcEndpoints: [{ networkClientId: 'mainnet-client' }],
    },
    '0x89': {
      defaultRpcEndpointIndex: 0,
      rpcEndpoints: [{ networkClientId: 'polygon-client' }],
    },
  })),
  selectNativeNetworkCurrencies: jest.fn(() => ['ETH', 'POL']),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    AccountTrackerController: {
      refresh: jest.fn(() => Promise.resolve()),
    },
    CurrencyRateController: {
      updateExchangeRate: jest.fn(() => Promise.resolve()),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('useBalanceRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns refreshBalance, handleRefresh, and refreshing', () => {
    const { result } = renderHook(() => useBalanceRefresh());

    expect(result.current.refreshBalance).toBeDefined();
    expect(result.current.handleRefresh).toBeDefined();
    expect(result.current.refreshing).toBe(false);
  });

  it('sets refreshing to true during handleRefresh and false after', async () => {
    const { result } = renderHook(() => useBalanceRefresh());

    expect(result.current.refreshing).toBe(false);

    await act(async () => {
      await result.current.handleRefresh();
    });

    expect(result.current.refreshing).toBe(false);
  });

  it('calls AccountTrackerController.refresh with network client IDs', async () => {
    const { result } = renderHook(() => useBalanceRefresh());

    await act(async () => {
      await result.current.refreshBalance();
    });

    expect(
      Engine.context.AccountTrackerController.refresh,
    ).toHaveBeenCalledWith(['mainnet-client', 'polygon-client']);
  });

  it('calls CurrencyRateController.updateExchangeRate with native currencies', async () => {
    const { result } = renderHook(() => useBalanceRefresh());

    await act(async () => {
      await result.current.refreshBalance();
    });

    expect(
      Engine.context.CurrencyRateController.updateExchangeRate,
    ).toHaveBeenCalledWith(['ETH', 'POL']);
  });

  it('handles individual promise rejections gracefully without logging', async () => {
    const mockError = new Error('Refresh failed');
    (
      Engine.context.AccountTrackerController.refresh as jest.Mock
    ).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useBalanceRefresh());

    await act(async () => {
      await result.current.refreshBalance();
    });

    // Promise.allSettled swallows individual rejections, so no error should be logged
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('handles timeout gracefully', async () => {
    jest.useFakeTimers();

    (
      Engine.context.AccountTrackerController.refresh as jest.Mock
    ).mockImplementation(
      () =>
        new Promise(() => {
          // eslint-disable-next-line @typescript-eslint/no-empty-function
        }),
    );

    const { result } = renderHook(() => useBalanceRefresh());

    const refreshPromise = act(async () => {
      await result.current.refreshBalance();
    });

    jest.advanceTimersByTime(5000);

    await refreshPromise;

    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Balance refresh timed out' }),
      'Error refreshing balance',
    );

    jest.useRealTimers();
  });
});
