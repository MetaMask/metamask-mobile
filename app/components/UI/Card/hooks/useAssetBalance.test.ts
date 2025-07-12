/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import useAssetBalance from './useAssetBalance';
import { FlashListAssetKey } from '../../Tokens/TokenList';
import { TOKEN_RATE_UNDEFINED } from '../../Tokens/constants';
import { deriveBalanceFromAssetMarketDetails } from '../../Tokens/util';
import { formatWithThreshold } from '../../../../util/assets';
import { isTestNet } from '../../../../util/networks';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../Tokens/util', () => ({
  deriveBalanceFromAssetMarketDetails: jest.fn(),
}));
jest.mock('../../../../util/assets', () => ({
  formatWithThreshold: jest.fn(),
}));
jest.mock('../../../../util/networks', () => ({ isTestNet: jest.fn() }));
jest.mock('../../../../selectors/multichain', () => ({
  makeSelectAssetByAddressAndChainId: jest.fn(() => jest.fn()),
  makeSelectNonEvmAssetById: jest.fn(() => jest.fn()),
}));
jest.mock('../../../../selectors/multichainNetworkController', () => ({
  selectIsEvmNetworkSelected: jest.fn(),
}));
jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn(),
  selectSelectedInternalAccountAddress: jest.fn(),
}));
jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrencyRateForChainId: jest.fn(),
  selectCurrentCurrency: jest.fn(),
}));
jest.mock('../../../../selectors/settings', () => ({
  selectShowFiatInTestnets: jest.fn(),
}));
jest.mock('../../../../selectors/tokenRatesController', () => ({
  selectSingleTokenPriceMarketData: jest.fn(),
}));
jest.mock('../../../../selectors/tokenBalancesController', () => ({
  selectSingleTokenBalance: jest.fn(),
}));
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: { [key: string]: string } = {
      'wallet.unable_to_find_conversion_rate': 'Unable to find conversion rate',
      'wallet.unable_to_load': 'Unable to load',
    };
    return translations[key] || key;
  }),
  default: { locale: 'en-US' },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockDeriveBalanceFromAssetMarketDetails =
  deriveBalanceFromAssetMarketDetails as jest.MockedFunction<
    typeof deriveBalanceFromAssetMarketDetails
  >;
const mockFormatWithThreshold = formatWithThreshold as jest.MockedFunction<
  typeof formatWithThreshold
>;
const mockIsTestNet = isTestNet as jest.MockedFunction<typeof isTestNet>;

describe('useAssetBalance', () => {
  const mockToken: FlashListAssetKey = {
    address: '0x1234567890123456789012345678901234567890',
    chainId: '0x1',
    isStaked: false,
  };

  const mockEvmAsset = {
    address: '0x1234567890123456789012345678901234567890',
    chainId: '0x1',
    symbol: 'TEST',
    name: 'Test Token',
    decimals: 18,
    balance: '1000000000000000000',
    balanceFiat: '1000.00',
    isETH: false,
    hasBalanceError: false,
    isStaked: false,
  };

  const mockNonEvmAsset = {
    address: 'bitcoin:mainnet/0x1234567890123456789012345678901234567890',
    chainId: 'bitcoin:mainnet',
    symbol: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    balance: '100000000',
    balanceFiat: '50000.00',
    isETH: false,
    hasBalanceError: false,
    isStaked: false,
  };

  const createMockSelector =
    (overrides: any = {}) =>
    (selector: any) => {
      const defaults = {
        selectedInternalAccountAddress: '0xtest',
        isEvmNetworkSelected: true,
        primaryCurrency: 'ETH',
        currentCurrency: 'USD',
        showFiatOnTestnets: true,
        selectedAccount: { id: 'account1' },
        exchangeRates: { price: 2000 },
        ...overrides,
      };

      if (selector.toString().includes('selectSelectedInternalAccountAddress'))
        return defaults.selectedInternalAccountAddress;
      if (selector.toString().includes('selectIsEvmNetworkSelected'))
        return defaults.isEvmNetworkSelected;
      if (selector.toString().includes('primaryCurrency'))
        return defaults.primaryCurrency;
      if (selector.toString().includes('selectCurrentCurrency'))
        return defaults.currentCurrency;
      if (selector.toString().includes('selectShowFiatInTestnets'))
        return defaults.showFiatOnTestnets;
      if (selector.toString().includes('selectSelectedInternalAccount'))
        return defaults.selectedAccount;
      if (selector.toString().includes('selectSingleTokenPriceMarketData'))
        return overrides.exchangeRates !== undefined
          ? overrides.exchangeRates
          : defaults.exchangeRates;
      if (selector.toString().includes('selectSingleTokenBalance'))
        return overrides.tokenBalances;
      if (selector.toString().includes('selectCurrencyRateForChainId'))
        return overrides.conversionRate;

      // This catches the dynamically created selectors from makeSelectAssetByAddressAndChainId
      // and makeSelectNonEvmAssetById
      if (typeof selector === 'function') {
        if (defaults.isEvmNetworkSelected) {
          return overrides.evmAsset !== undefined
            ? overrides.evmAsset
            : mockEvmAsset;
        }
        return overrides.nonEvmAsset !== undefined
          ? overrides.nonEvmAsset
          : mockNonEvmAsset;
      }

      return defaults.exchangeRates;
    };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation(createMockSelector());
    mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
      balanceFiat: '$1,000.00',
      balanceValueFormatted: '1.0',
    });
    mockFormatWithThreshold.mockImplementation((value: number | null) =>
      value ? value.toFixed(2) : '0',
    );
    mockIsTestNet.mockReturnValue(false);
  });

  describe('null/undefined token handling', () => {
    it('should return default values when token is null/undefined', () => {
      const { result: nullResult } = renderHook(() => useAssetBalance(null));
      const { result: undefinedResult } = renderHook(() =>
        useAssetBalance(undefined),
      );

      [nullResult, undefinedResult].forEach((result) => {
        expect(result.current.asset).toEqual({
          ...mockEvmAsset,
          balanceFiat: undefined,
          isStaked: false,
        });
        expect(result.current.balanceFiat).toBeUndefined();
        expect(result.current.mainBalance).toBe('');
        expect(result.current.secondaryBalance).toBeUndefined();
      });
    });
  });

  describe('EVM assets', () => {
    it('should handle EVM asset with ETH primary currency', () => {
      mockUseSelector.mockImplementation(
        createMockSelector({ primaryCurrency: 'ETH' }),
      );
      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
      expect(result.current.mainBalance).toBe('1.0'.toUpperCase());
      expect(result.current.secondaryBalance).toBe('$1,000.00'.toUpperCase());
    });

    it('should handle EVM asset with fiat primary currency', () => {
      mockUseSelector.mockImplementation(
        createMockSelector({ primaryCurrency: 'USD' }),
      );
      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
      expect(result.current.mainBalance).toBe('$1,000.00');
      expect(result.current.secondaryBalance).toBe('1.0'.toUpperCase());
    });

    it('should handle ETH native token correctly', () => {
      const ethAsset = { ...mockEvmAsset, isETH: true };
      mockUseSelector.mockImplementation(
        createMockSelector({
          primaryCurrency: 'ETH',
          evmAsset: ethAsset,
        }),
      );
      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
      expect(result.current.mainBalance).toBe('1.0'.toUpperCase());
      expect(result.current.secondaryBalance).toBe('$1,000.00'.toUpperCase());
    });

    it('should handle asset with balance error', () => {
      const errorAsset = {
        ...mockEvmAsset,
        hasBalanceError: true,
        symbol: 'TEST',
      };

      // Create a more explicit mock implementation that tracks calls
      const mockSelectorImplementation = jest
        .fn()
        .mockImplementation((selector: any) => {
          if (
            selector.toString().includes('selectSelectedInternalAccountAddress')
          )
            return '0xtest';
          if (selector.toString().includes('selectIsEvmNetworkSelected'))
            return true;
          if (selector.toString().includes('primaryCurrency')) return 'ETH';
          if (selector.toString().includes('selectCurrentCurrency'))
            return 'USD';
          if (selector.toString().includes('selectShowFiatInTestnets'))
            return true;
          if (selector.toString().includes('selectSelectedInternalAccount'))
            return { id: 'account1' };
          if (selector.toString().includes('selectSingleTokenPriceMarketData'))
            return { price: 2000 };
          if (selector.toString().includes('selectSingleTokenBalance'))
            return {};
          if (selector.toString().includes('selectCurrencyRateForChainId'))
            return 0;

          // Handle the dynamic selector that should return the error asset
          if (typeof selector === 'function') {
            return errorAsset;
          }

          return { price: 2000 };
        });

      mockUseSelector.mockImplementation(mockSelectorImplementation);

      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balanceFiat: '$1,000.00',
        balanceValueFormatted: '1.0',
      });

      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.mainBalance).toBe('TEST');
      expect(result.current.secondaryBalance).toBe('Unable to load');
    });

    it('should handle undefined asset when no asset found', () => {
      mockUseSelector.mockImplementation(
        createMockSelector({
          evmAsset: undefined,
          exchangeRates: undefined,
        }),
      );
      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balanceFiat: undefined,
        balanceValueFormatted: '',
      });
      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toEqual({
        ...mockEvmAsset,
        balanceFiat: undefined,
        isStaked: false,
      });
      expect(result.current.mainBalance).toBe('');
      expect(result.current.secondaryBalance).toBeUndefined();
    });
  });

  describe('Non-EVM assets', () => {
    it('should handle non-EVM asset', () => {
      const mockSelectorImplementation = jest
        .fn()
        .mockImplementation((selector: any) => {
          if (
            selector.toString().includes('selectSelectedInternalAccountAddress')
          )
            return '0xtest';
          if (selector.toString().includes('selectIsEvmNetworkSelected'))
            return false; // Non-EVM network
          if (selector.toString().includes('primaryCurrency')) return 'ETH';
          if (selector.toString().includes('selectCurrentCurrency'))
            return 'USD';
          if (selector.toString().includes('selectShowFiatInTestnets'))
            return true;
          if (selector.toString().includes('selectSelectedInternalAccount'))
            return { id: 'account1' };
          if (selector.toString().includes('selectSingleTokenPriceMarketData'))
            return { price: 2000 };
          if (selector.toString().includes('selectSingleTokenBalance'))
            return {};
          if (selector.toString().includes('selectCurrencyRateForChainId'))
            return 0;

          // Handle the dynamic selector that should return the non-EVM asset
          if (typeof selector === 'function') {
            return mockNonEvmAsset;
          }

          return { price: 2000 };
        });

      mockUseSelector.mockImplementation(mockSelectorImplementation);

      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balanceFiat: '$50000.00',
        balanceValueFormatted: '1.0',
      });

      mockFormatWithThreshold.mockImplementation(
        (
          value: number | null,
          _threshold: number,
          _locale: string,
          _options: any,
        ) => {
          if (!value) return '0';
          if (_options?.style === 'currency') return `$${value.toFixed(2)}`;
          return value.toFixed(5);
        },
      );

      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
      expect(result.current.asset?.symbol).toBe('BTC');
      expect(result.current.asset?.balanceFiat).toBe('$50000.00');
    });

    it('should handle non-EVM asset with missing selected account', () => {
      mockUseSelector.mockImplementation(
        createMockSelector({
          isEvmNetworkSelected: false,
          selectedAccount: undefined,
          nonEvmAsset: undefined,
          exchangeRates: undefined,
        }),
      );
      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balanceFiat: undefined,
        balanceValueFormatted: '',
      });
      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toEqual({
        ...mockNonEvmAsset,
        balanceFiat: undefined,
        isStaked: false,
      });
      expect(result.current.mainBalance).toBe('');
      expect(result.current.secondaryBalance).toBeUndefined();
    });
  });

  describe('Test network scenarios', () => {
    it('should handle test network with fiat disabled for ETH', () => {
      mockIsTestNet.mockReturnValue(true);
      const ethAsset = { ...mockEvmAsset, isETH: true };
      mockUseSelector.mockImplementation(
        createMockSelector({
          primaryCurrency: 'ETH',
          showFiatOnTestnets: false,
          evmAsset: ethAsset,
        }),
      );
      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
      expect(result.current.mainBalance).toBe('1.0'.toUpperCase());
      expect(result.current.secondaryBalance).toBe('$1,000.00'.toUpperCase());
    });

    it('should handle test network with fiat disabled for USD primary currency', () => {
      mockIsTestNet.mockReturnValue(true);
      mockUseSelector.mockImplementation(
        createMockSelector({
          primaryCurrency: 'USD',
          showFiatOnTestnets: false,
        }),
      );
      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balanceFiat: undefined,
        balanceValueFormatted: '1.0',
      });
      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.mainBalance).toBe('Unable to find conversion rate');
      expect(result.current.secondaryBalance).toBe('1.0'.toUpperCase());
    });
  });

  describe('Special cases', () => {
    it('should handle TOKEN_RATE_UNDEFINED', () => {
      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balanceFiat: TOKEN_RATE_UNDEFINED,
        balanceValueFormatted: '1.0',
      });
      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.mainBalance).toBe('1.0');
      expect(result.current.secondaryBalance).toBe(
        'Unable to find conversion rate',
      );
    });

    it('should handle balance error precedence over TOKEN_RATE_UNDEFINED', () => {
      const errorAsset = {
        ...mockEvmAsset,
        hasBalanceError: true,
        symbol: 'TEST',
      };
      mockUseSelector.mockImplementation(
        createMockSelector({ evmAsset: errorAsset }),
      );
      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balanceFiat: TOKEN_RATE_UNDEFINED,
        balanceValueFormatted: '1.0',
      });
      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.mainBalance).toBe('1.0');
      expect(result.current.secondaryBalance).toBe(
        'Unable to find conversion rate',
      );
    });

    it('should handle staked asset correctly', () => {
      const stakedAsset = { ...mockEvmAsset, isStaked: true };

      const mockSelectorImplementation = jest
        .fn()
        .mockImplementation((selector: any) => {
          if (
            selector.toString().includes('selectSelectedInternalAccountAddress')
          )
            return '0xtest';
          if (selector.toString().includes('selectIsEvmNetworkSelected'))
            return true;
          if (selector.toString().includes('primaryCurrency')) return 'USD';
          if (selector.toString().includes('selectCurrentCurrency'))
            return 'USD';
          if (selector.toString().includes('selectShowFiatInTestnets'))
            return true;
          if (selector.toString().includes('selectSelectedInternalAccount'))
            return { id: 'account1' };
          if (selector.toString().includes('selectSingleTokenPriceMarketData'))
            return { price: 2000 };
          if (selector.toString().includes('selectSingleTokenBalance'))
            return {};
          if (selector.toString().includes('selectCurrencyRateForChainId'))
            return 0;

          if (typeof selector === 'function') {
            return stakedAsset;
          }

          return { price: 2000 };
        });

      mockUseSelector.mockImplementation(mockSelectorImplementation);

      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
      expect(result.current.asset?.isStaked).toBe(true);
      expect(result.current.mainBalance).toBe('$1,000.00');
    });

    it('should handle missing selectedInternalAccountAddress', () => {
      mockUseSelector.mockImplementation(
        createMockSelector({
          selectedInternalAccountAddress: null,
          primaryCurrency: 'USD',
        }),
      );
      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toEqual({
        ...mockEvmAsset,
        balanceFiat: '$1,000.00',
        isStaked: false,
      });
      expect(result.current.balanceFiat).toBe('$1,000.00');
      expect(result.current.mainBalance).toBe('$1,000.00');
    });
  });
});
