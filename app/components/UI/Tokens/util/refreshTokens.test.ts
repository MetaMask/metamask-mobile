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
    AccountTrackerController: {
      refresh: jest.fn(),
    },
    CurrencyRateController: {
      updateExchangeRate: jest.fn(),
    },
    TokenRatesController: {
      updateExchangeRatesByChainId: jest.fn(),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('refreshTokens', () => {
  const mockSetRefreshing = jest.fn();

  const mockProps = {
    isEvmSelected: true,
    setRefreshing: mockSetRefreshing,
    evmNetworkConfigurationsByChainId: {
      '0x1': { chainId: '0x1' as Hex, nativeCurrency: 'ETH' },
      '0x89': { chainId: '0x89' as Hex, nativeCurrency: 'POL' },
    },
    nativeCurrencies: ['ETH', 'POL'],
    internalAccount: '',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should refresh tokens when EVM is selected', async () => {
    await refreshTokens(mockProps);

    // Ensure setRefreshing is called correctly
    expect(mockSetRefreshing).toHaveBeenCalledWith(true);

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
      Engine.context.TokenRatesController.updateExchangeRatesByChainId,
    ).toHaveBeenCalledTimes(2);
    expect(
      Engine.context.TokenRatesController.updateExchangeRatesByChainId,
    ).toHaveBeenCalledWith({
      chainId: '0x1',
      nativeCurrency: 'ETH',
    });
    expect(
      Engine.context.TokenRatesController.updateExchangeRatesByChainId,
    ).toHaveBeenCalledWith({
      chainId: '0x89',
      nativeCurrency: 'POL',
    });

    // Ensure setRefreshing is called again to reset state
    expect(mockSetRefreshing).toHaveBeenCalledWith(false);
  });

  it('should not refresh tokens if EVM is not selected', async () => {
    await refreshEvmTokens({ ...mockProps, isEvmSelected: false });

    // Ensure setRefreshing is never called
    expect(mockSetRefreshing).not.toHaveBeenCalled();

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
      Engine.context.TokenRatesController.updateExchangeRatesByChainId,
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

    // Ensure setRefreshing is still called to reset state
    expect(mockSetRefreshing).toHaveBeenCalledWith(false);
  });
});
