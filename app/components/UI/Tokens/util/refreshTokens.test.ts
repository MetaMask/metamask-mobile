import { refreshTokens } from './refreshTokens';
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
    TokenRatesController: {
      updateExchangeRates: jest.fn(),
    },
    MultichainBalancesController: {
      updateBalance: jest.fn(),
    },
    NetworkController: {
      state: {
        networkConfigurationsByChainId: {
          '0x1': { chainId: '0x1' as Hex, nativeCurrency: 'ETH' },
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

describe('refreshTokens', () => {
  const mockProps = {
    isSolanaSelected: true,
    evmNetworkConfigurationsByChainId: {
      '0x1': { chainId: '0x1' as Hex, nativeCurrency: 'ETH' },
      '0x89': { chainId: '0x89' as Hex, nativeCurrency: 'POL' },
    },
    internalAccount: '',
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
      Engine.context.TokenRatesController.updateExchangeRates as jest.Mock
    ).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('refreshes tokens when EVM is selected', async () => {
    await refreshTokens(mockProps);

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

    expect(
      Engine.context.TokenRatesController.updateExchangeRates,
    ).toHaveBeenCalledWith([
      { chainId: '0x1', nativeCurrency: 'ETH' },
      { chainId: '0x89', nativeCurrency: 'POL' },
    ]);
  });

  it('calls updateBalance for Solana when selected', async () => {
    await refreshTokens({
      ...mockProps,
      isSolanaSelected: true,
      selectedAccountId: 'test-account-id',
    });

    expect(
      Engine.context.MultichainBalancesController.updateBalance,
    ).toHaveBeenCalledWith('test-account-id');
  });

  it('does not call updateBalance when Solana is not selected', async () => {
    await refreshTokens({ ...mockProps, isSolanaSelected: false });

    expect(
      Engine.context.TokenDetectionController.detectTokens,
    ).toHaveBeenCalled();
    expect(
      Engine.context.TokenBalancesController.updateBalances,
    ).toHaveBeenCalled();
    expect(
      Engine.context.TokenRatesController.updateExchangeRates,
    ).toHaveBeenCalled();
    expect(
      Engine.context.MultichainBalancesController.updateBalance,
    ).not.toHaveBeenCalled();
  });

  it('logs an error if a timeout occurs', async () => {
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

      const refreshPromise = refreshTokens(mockProps);

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

  it('does not call updateBalance if selectedAccountId is undefined', async () => {
    await refreshTokens({
      isSolanaSelected: true,
      evmNetworkConfigurationsByChainId: {},
      selectedAccountId: undefined,
    });

    expect(
      Engine.context.MultichainBalancesController.updateBalance,
    ).not.toHaveBeenCalled();
  });
});
