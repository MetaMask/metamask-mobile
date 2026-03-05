import { refreshEvmTokens } from './refreshEvmTokens';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { Hex } from '@metamask/utils';

jest.mock('../../../../core/Engine', () => ({
  context: {
    TokenDetectionController: {
      detectTokens: jest.fn(),
    },
    TokenBalancesController: {
      updateBalances: jest.fn(),
    },
    AccountTrackerController: {
      refresh: jest.fn(),
    },
    CurrencyRateController: {
      updateExchangeRate: jest.fn(),
    },
    TokenRatesController: {
      updateExchangeRates: jest.fn(),
    },
    NetworkController: {
      state: {
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1',
          },
        },
      },
    },
    PreferencesController: {
      state: {
        tokenNetworkFilter: {
          '0x1': true,
          '0x89': true,
        },
      },
    },
    NetworkEnablementController: {
      state: {
        enabledNetworkMap: {
          eip155: {
            '0x1': true,
            '0x89': true,
          },
        },
      },
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('refreshEvmTokens', () => {
  const mockProps = {
    isEvmSelected: true,
    evmNetworkConfigurationsByChainId: {
      '0x1': { chainId: '0x1' as Hex, nativeCurrency: 'ETH' },
      '0x89': { chainId: '0x89' as Hex, nativeCurrency: 'POL' },
    },
    nativeCurrencies: ['ETH', 'POL'],
  };

  beforeEach(() => {
    jest.useRealTimers();
    // Reset mocks to resolved state
    (
      Engine.context.TokenDetectionController.detectTokens as jest.Mock
    ).mockResolvedValue(undefined);
    (
      Engine.context.TokenBalancesController.updateBalances as jest.Mock
    ).mockResolvedValue(undefined);
    (
      Engine.context.AccountTrackerController.refresh as jest.Mock
    ).mockResolvedValue(undefined);
    (
      Engine.context.CurrencyRateController.updateExchangeRate as jest.Mock
    ).mockResolvedValue(undefined);
    (
      Engine.context.TokenRatesController.updateExchangeRates as jest.Mock
    ).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should refresh tokens when EVM is selected', async () => {
    await refreshEvmTokens(mockProps);

    // Check if controllers are called with expected arguments
    expect(
      Engine.context.TokenDetectionController.detectTokens,
    ).toHaveBeenCalledWith({
      chainIds: ['0x1', '0x89'],
    });

    expect(
      Engine.context.TokenBalancesController.updateBalances,
    ).toHaveBeenCalledWith({
      chainIds: ['0x1', '0x89'],
    });

    expect(Engine.context.AccountTrackerController.refresh).toHaveBeenCalled();

    expect(
      Engine.context.CurrencyRateController.updateExchangeRate,
    ).toHaveBeenCalledWith(['ETH', 'POL']);

    expect(
      Engine.context.TokenRatesController.updateExchangeRates,
    ).toHaveBeenCalledWith([
      { chainId: '0x1', nativeCurrency: 'ETH' },
      { chainId: '0x89', nativeCurrency: 'POL' },
    ]);
  });

  it('should not refresh tokens if EVM is not selected', async () => {
    await refreshEvmTokens({ ...mockProps, isEvmSelected: false });

    // Ensure controllers are never called
    expect(
      Engine.context.TokenDetectionController.detectTokens,
    ).not.toHaveBeenCalled();
    expect(
      Engine.context.TokenBalancesController.updateBalances,
    ).not.toHaveBeenCalled();
    expect(
      Engine.context.AccountTrackerController.refresh,
    ).not.toHaveBeenCalled();
    expect(
      Engine.context.CurrencyRateController.updateExchangeRate,
    ).not.toHaveBeenCalled();
    expect(
      Engine.context.TokenRatesController.updateExchangeRates,
    ).not.toHaveBeenCalled();
  });

  it('should log an error if a timeout occurs', async () => {
    jest.useFakeTimers();

    try {
      // Mock a promise that never resolves to trigger timeout
      const mockDetectTokens = jest.fn().mockImplementation(
        () =>
          new Promise(() => {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
          }),
      );
      (
        Engine.context.TokenDetectionController.detectTokens as jest.Mock
      ).mockImplementation(mockDetectTokens);

      const refreshPromise = refreshEvmTokens(mockProps);

      // Advance timers past the 5 second timeout
      jest.advanceTimersByTime(6000);

      await refreshPromise;

      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('timed out'),
        }),
        'Error while refreshing tokens',
      );
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });
});
