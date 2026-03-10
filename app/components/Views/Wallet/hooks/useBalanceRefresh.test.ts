import { renderHook, act } from '@testing-library/react-native';
import { useBalanceRefresh } from './useBalanceRefresh';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

let mockPopularEvmNetworks: string[] = ['0x1', '0x89'];

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector()),
}));

jest.mock('../../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: () => ({
    popularEvmNetworks: mockPopularEvmNetworks,
  }),
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
  selectNetworkConfigurations: jest.fn(() => ({})),
}));

jest.mock('../../../../selectors/featureFlagController/homepage', () => ({
  selectHomepageSectionsV1Enabled: jest.fn(() => true),
}));

jest.mock('../../../../selectors/networkEnablementController', () => ({
  selectEVMEnabledNetworks: jest.fn(() => []),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    AccountTrackerController: {
      refresh: jest.fn(() => Promise.resolve()),
    },
    CurrencyRateController: {
      updateExchangeRate: jest.fn(() => Promise.resolve()),
    },
    TokenDetectionController: {
      detectTokens: jest.fn(() => Promise.resolve()),
    },
    TokenBalancesController: {
      updateBalances: jest.fn(() => Promise.resolve()),
    },
    NftDetectionController: {
      detectNfts: jest.fn(() => Promise.resolve()),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

describe('useBalanceRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPopularEvmNetworks = ['0x1', '0x89'];
    (
      Engine.context.AccountTrackerController.refresh as jest.Mock
    ).mockResolvedValue(undefined);
    (
      Engine.context.CurrencyRateController.updateExchangeRate as jest.Mock
    ).mockResolvedValue(undefined);
    (
      Engine.context.TokenDetectionController.detectTokens as jest.Mock
    ).mockResolvedValue(undefined);
    (
      Engine.context.TokenBalancesController.updateBalances as jest.Mock
    ).mockResolvedValue(undefined);
    (
      Engine.context.NftDetectionController.detectNfts as jest.Mock
    ).mockResolvedValue(undefined);
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

  it('calls TokenDetectionController.detectTokens and TokenBalancesController.updateBalances with popular chain IDs', async () => {
    const { result } = renderHook(() => useBalanceRefresh());

    await act(async () => {
      await result.current.refreshBalance();
    });

    expect(
      Engine.context.TokenDetectionController.detectTokens,
    ).toHaveBeenCalledWith({ chainIds: ['0x1', '0x89'] });
    expect(
      Engine.context.TokenBalancesController.updateBalances,
    ).toHaveBeenCalledWith({ chainIds: ['0x1', '0x89'] });
  });

  it('calls NftDetectionController.detectNfts with popular chain IDs when sections v1 is enabled', async () => {
    const { result } = renderHook(() => useBalanceRefresh());

    await act(async () => {
      await result.current.refreshBalance();
    });

    expect(
      Engine.context.NftDetectionController.detectNfts,
    ).toHaveBeenCalledWith(['0x1', '0x89']);
  });

  it('calls NftDetectionController.detectNfts with enabled chain IDs when sections v1 is disabled', async () => {
    const { selectHomepageSectionsV1Enabled } = jest.requireMock(
      '../../../../selectors/featureFlagController/homepage',
    );
    const { selectEVMEnabledNetworks } = jest.requireMock(
      '../../../../selectors/networkEnablementController',
    );
    selectHomepageSectionsV1Enabled.mockReturnValue(false);
    selectEVMEnabledNetworks.mockReturnValue(['0x1']);

    const { result } = renderHook(() => useBalanceRefresh());

    await act(async () => {
      await result.current.refreshBalance();
    });

    expect(
      Engine.context.NftDetectionController.detectNfts,
    ).toHaveBeenCalledWith(['0x1']);

    selectHomepageSectionsV1Enabled.mockReturnValue(true);
    selectEVMEnabledNetworks.mockReturnValue([]);
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

  it('does not log errors when individual refresh promises reject', async () => {
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

  it('logs timeout as non-error without emitting error events', async () => {
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

    expect(Logger.log).toHaveBeenCalledWith('Balance refresh timed out');
    expect(Logger.error).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('logs unexpected refresh exceptions as errors', async () => {
    const unexpectedError = new Error('Unexpected refresh failure');
    (
      Engine.context.AccountTrackerController.refresh as jest.Mock
    ).mockImplementationOnce(() => {
      throw unexpectedError;
    });

    const { result } = renderHook(() => useBalanceRefresh());

    await act(async () => {
      await result.current.refreshBalance();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      unexpectedError,
      'Error refreshing balance',
    );
  });

  it('calls AccountTrackerController.refresh only for popular EVM chain IDs', async () => {
    mockPopularEvmNetworks = ['0x1'];

    const { result } = renderHook(() => useBalanceRefresh());

    await act(async () => {
      await result.current.refreshBalance();
    });

    expect(
      Engine.context.AccountTrackerController.refresh,
    ).toHaveBeenCalledWith(['mainnet-client']);
  });

  it('calls AccountTrackerController.refresh with empty array when no popular chains', async () => {
    mockPopularEvmNetworks = [];

    const { result } = renderHook(() => useBalanceRefresh());

    await act(async () => {
      await result.current.refreshBalance();
    });

    expect(
      Engine.context.AccountTrackerController.refresh,
    ).toHaveBeenCalledWith([]);
  });
});
