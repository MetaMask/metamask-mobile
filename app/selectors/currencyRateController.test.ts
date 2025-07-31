import {
  selectConversionRate,
  selectCurrentCurrency,
  selectCurrencyRates,
  selectConversionRateByChainId,
  selectCurrencyRateForChainId,
  selectUSDConversionRateByChainId,
} from './currencyRateController';
import { isTestNet } from '../../app/util/networks';
import { CurrencyRateState } from '@metamask/assets-controllers';
import type { RootState } from '../reducers';
// eslint-disable-next-line import/no-namespace
import * as NetworkControllerSelectors from './networkController';
import { MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';

jest.mock('../../app/util/networks', () => ({
  isTestNet: jest.fn(),
}));

describe('CurrencyRateController Selectors', () => {
  const mockCurrencyRateState = {
    currencyRates: {
      ETH: { conversionRate: 3000, usdConversionRate: 3000 },
      BTC: { conversionRate: 60000, usdConversionRate: 60000 },
    },
    currentCurrency: 'USD',
  };

  describe('selectConversionRate', () => {
    const mockChainId = '1';
    const mockTicker = 'ETH';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns undefined if on a testnet and fiat is disabled', () => {
      (isTestNet as jest.Mock).mockReturnValue(true);

      const result = selectConversionRate.resultFunc(
        mockCurrencyRateState as unknown as CurrencyRateState,
        mockChainId as `0x${string}`,
        mockTicker,
        false,
      );
      expect(result).toBeUndefined();
    });

    it('returns the conversion rate for a valid ticker', () => {
      (isTestNet as jest.Mock).mockReturnValue(false);

      const result = selectConversionRate.resultFunc(
        mockCurrencyRateState as unknown as CurrencyRateState,
        mockChainId as `0x${string}`,
        mockTicker,
        true,
      );
      expect(result).toBe(3000);
    });

    it('returns undefined if no ticker is provided', () => {
      (isTestNet as jest.Mock).mockReturnValue(false);

      const result = selectConversionRate.resultFunc(
        mockCurrencyRateState as unknown as CurrencyRateState,
        mockChainId as `0x${string}`,
        '',
        true,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('selectConversionRateByChainId', () => {
    const mockChainId = '1';
    const mockNativeCurrency = 'ETH';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns undefined if on a testnet and fiat is disabled', () => {
      (isTestNet as jest.Mock).mockReturnValue(true);

      const result = selectConversionRateByChainId.resultFunc(
        mockCurrencyRateState.currencyRates as unknown as CurrencyRateState['currencyRates'],
        mockChainId as `0x${string}`,
        false,
        mockNativeCurrency,
        false,
      );

      expect(result).toBeUndefined();
    });

    it('returns the conversion rate for the native currency of the chain id', () => {
      (isTestNet as jest.Mock).mockReturnValue(false);

      const result = selectConversionRateByChainId.resultFunc(
        mockCurrencyRateState.currencyRates as unknown as CurrencyRateState['currencyRates'],
        mockChainId as `0x${string}`,
        true,
        mockNativeCurrency,
        false,
      );

      expect(result).toBe(3000);
    });
  });

  describe('selectCurrentCurrency', () => {
    it('returns the current currency from the state', () => {
      const result = selectCurrentCurrency.resultFunc(
        mockCurrencyRateState as unknown as CurrencyRateState,
      );
      expect(result).toBe('USD');
    });

    it('returns undefined if current currency is not set', () => {
      const result = selectCurrentCurrency.resultFunc(
        {} as unknown as CurrencyRateState,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('selectCurrencyRates', () => {
    it('returns all conversion rates from the state', () => {
      const result = selectCurrencyRates.resultFunc(
        mockCurrencyRateState as unknown as CurrencyRateState,
      );
      expect(result).toStrictEqual(mockCurrencyRateState.currencyRates);
    });

    it('returns undefined if conversion rates are not set', () => {
      const result = selectCurrencyRates.resultFunc(
        {} as unknown as CurrencyRateState,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('selectCurrencyRateForChainId', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    const arrange = () => {
      const mockState: RootState = {
        engine: {
          backgroundState: {
            CurrencyRateController: {
              currencyRates: {
                USD: {
                  conversionRate: 0.7,
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const mockSelectNetworkConfigurationByChainId = jest
        .spyOn(
          NetworkControllerSelectors,
          'selectNetworkConfigurationByChainId',
        )
        .mockReturnValue({
          nativeCurrency: 'USD',
        } as MultichainNetworkConfiguration);

      return { mockState, mockSelectNetworkConfigurationByChainId };
    };
    it('returns conversion rate when currency rates and network config exist', () => {
      const { mockState } = arrange();
      const result = selectCurrencyRateForChainId(mockState, '0x1');
      expect(result).toBe(0.7);
    });

    it('returns 0 when currency rates or network config are missing', () => {
      const { mockState } = arrange();
      mockState.engine.backgroundState.CurrencyRateController.currencyRates =
        {};
      const result = selectCurrencyRateForChainId(mockState, '0x1');
      expect(result).toBe(0);
    });

    it('handles parameter memoization correctly', () => {
      const { mockState, mockSelectNetworkConfigurationByChainId } = arrange();
      mockSelectNetworkConfigurationByChainId.mockImplementation(
        (_state, chainId) => {
          if (chainId === '0x1') {
            return {
              nativeCurrency: 'USD',
            } as MultichainNetworkConfiguration;
          }

          // Return config with a missing native currency
          return {
            nativeCurrency: 'ETH',
          } as MultichainNetworkConfiguration;
        },
      );

      // Test selector with different parameters
      const result1 = selectCurrencyRateForChainId(mockState, '0x1');
      expect(result1).toBe(0.7);
      const result2 = selectCurrencyRateForChainId(mockState, '0x2');
      expect(result2).toBe(0);

      // Assert - selector was called twice
      expect(mockSelectNetworkConfigurationByChainId).toHaveBeenCalledTimes(2);
      mockSelectNetworkConfigurationByChainId.mockClear();

      // Test selector switching parameters again
      const result3 = selectCurrencyRateForChainId(mockState, '0x1');
      expect(result3).toBe(0.7);
      const result4 = selectCurrencyRateForChainId(mockState, '0x2');
      expect(result4).toBe(0);

      // Assert - selector was not called again
      expect(mockSelectNetworkConfigurationByChainId).toHaveBeenCalledTimes(0);
    });
  });

  describe('selectUSDConversionRateByChainId', () => {
    const chainId = '0x1';
    const nativeCurrency = 'ETH';
    const usdConversionRate = 3000;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const createMockState = (
      currencyRates = mockCurrencyRateState.currencyRates,
    ): RootState =>
      ({
        engine: {
          backgroundState: {
            CurrencyRateController: {
              currencyRates,
            },
          },
        },
      } as unknown as RootState);

    it('returns the correct USD conversion rate for a valid chain ID and native currency', () => {
      jest
        .spyOn(
          NetworkControllerSelectors,
          'selectNetworkConfigurationByChainId',
        )
        .mockReturnValue({
          nativeCurrency,
        } as MultichainNetworkConfiguration);

      const result = selectUSDConversionRateByChainId(
        createMockState(),
        chainId,
      );
      expect(result).toBe(usdConversionRate);
    });

    it('returns undefined if network configuration is not found', () => {
      jest
        .spyOn(
          NetworkControllerSelectors,
          'selectNetworkConfigurationByChainId',
        )
        .mockReturnValue(
          undefined as unknown as MultichainNetworkConfiguration,
        );

      const result = selectUSDConversionRateByChainId(
        createMockState(),
        chainId,
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined if usdConversionRate is not available', () => {
      jest
        .spyOn(
          NetworkControllerSelectors,
          'selectNetworkConfigurationByChainId',
        )
        .mockReturnValue({
          nativeCurrency: 'UNKNOWN',
        } as MultichainNetworkConfiguration);

      const result = selectUSDConversionRateByChainId(
        createMockState(),
        chainId,
      );
      expect(result).toBeUndefined();
    });

    it('handles edge case where native currency is an empty string', () => {
      const mockNetworkConfig = {
        nativeCurrency: '',
      } as MultichainNetworkConfiguration;

      jest
        .spyOn(
          NetworkControllerSelectors,
          'selectNetworkConfigurationByChainId',
        )
        .mockReturnValue(mockNetworkConfig);

      const result = selectUSDConversionRateByChainId(
        createMockState(),
        chainId,
      );
      expect(result).toBeUndefined();
    });
  });
});
