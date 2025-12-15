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

  afterEach(() => {
    jest.clearAllMocks();
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

  it('logs an error if an exception occurs', async () => {
    (
      Engine.context.TokenDetectionController.detectTokens as jest.Mock
    ).mockRejectedValue(new Error('Failed to detect tokens'));

    await refreshTokens(mockProps);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Error while refreshing tokens',
    );
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
