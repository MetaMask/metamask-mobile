import { performEvmRefresh } from './tokenRefreshUtils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { Hex } from '@metamask/utils';

jest.mock('../../../../core/Engine', () => ({
  context: {
    TokenDetectionController: {
      detectTokens: jest.fn(() => Promise.resolve()),
    },
    TokenBalancesController: {
      updateBalances: jest.fn(() => Promise.resolve()),
    },
    AccountTrackerController: {
      refresh: jest.fn(() => Promise.resolve()),
    },
    CurrencyRateController: {
      updateExchangeRate: jest.fn(() => Promise.resolve()),
    },
    TokenRatesController: {
      updateExchangeRates: jest.fn(() => Promise.resolve()),
    },
    NetworkController: {
      state: {
        networkConfigurationsByChainId: {
          '0x1': {
            rpcEndpoints: [{ networkClientId: 'client-1' }],
            defaultRpcEndpointIndex: 0,
          },
          '0x2': {
            rpcEndpoints: [{ networkClientId: 'client-2' }],
            defaultRpcEndpointIndex: 0,
          },
        },
      },
    },
    NetworkEnablementController: {
      state: {
        enabledNetworkMap: {
          eip155: {
            '0x1': true,
            '0x2': true,
          },
        },
      },
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('performEvmRefresh', () => {
  const fakeNetworkConfigurations = {
    '0x1': { chainId: '0x1', nativeCurrency: 'ETH' },
    '0x2': { chainId: '0x2', nativeCurrency: 'BNB' },
  };

  const fakeNativeCurrencies = ['ETH', 'BNB'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should perform all EVM refresh actions successfully', async () => {
    await performEvmRefresh(
      fakeNetworkConfigurations as Record<
        string,
        { chainId: Hex; nativeCurrency: string }
      >,
      fakeNativeCurrencies,
    );

    expect(
      Engine.context.TokenDetectionController.detectTokens,
    ).toHaveBeenCalledWith({
      chainIds: ['0x1', '0x2'],
    });

    expect(
      Engine.context.TokenBalancesController.updateBalances,
    ).toHaveBeenCalledWith({
      chainIds: ['0x1', '0x2'],
    });

    expect(
      Engine.context.AccountTrackerController.refresh,
    ).toHaveBeenCalledWith(['client-1', 'client-2']);

    expect(
      Engine.context.CurrencyRateController.updateExchangeRate,
    ).toHaveBeenCalledWith(fakeNativeCurrencies);

    expect(
      Engine.context.TokenRatesController.updateExchangeRates,
    ).toHaveBeenCalledWith([
      { chainId: '0x1', nativeCurrency: 'ETH' },
      { chainId: '0x2', nativeCurrency: 'BNB' },
    ]);

    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('filters network configurations when updating token exchange rates', async () => {
    // This is a rare edge-case. NetworkConfigurations should have a native currency
    const invalidNetworkConfiguration = {
      '0x1': { chainId: '0x1', nativeCurrency: undefined as unknown as string },
    } as const;
    const currencies = ['ETH'];

    await performEvmRefresh(invalidNetworkConfiguration, currencies);
    expect(
      Engine.context.TokenRatesController.updateExchangeRates,
    ).toHaveBeenCalledWith([]); // This controller handles when there is no chains to update
  });

  it('should catch and log error if any action fails', async () => {
    (
      Engine.context.TokenDetectionController.detectTokens as jest.Mock
    ).mockRejectedValueOnce(new Error('Simulated error'));

    await performEvmRefresh(
      fakeNetworkConfigurations as Record<
        string,
        { chainId: Hex; nativeCurrency: string }
      >,
      fakeNativeCurrencies,
    );

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Error while refreshing tokens',
    );
  });
});
