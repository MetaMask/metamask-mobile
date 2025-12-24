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

  afterEach(() => {
    jest.clearAllMocks();
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

  it('should log an error if an exception occurs', async () => {
    (
      Engine.context.TokenDetectionController.detectTokens as jest.Mock
    ).mockRejectedValue(new Error('Failed to detect tokens'));

    await refreshEvmTokens(mockProps);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Error while refreshing tokens',
    );
  });
});
