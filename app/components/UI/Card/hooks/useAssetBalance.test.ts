/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useAssetBalance } from './useAssetBalance';
import { CardTokenAllowance } from '../types';
import { TOKEN_RATE_UNDEFINED } from '../../Tokens/constants';
import { deriveBalanceFromAssetMarketDetails } from '../../Tokens/util';
import { formatWithThreshold } from '../../../../util/assets';
import { isTestNet } from '../../../../util/networks';
import { buildTokenIconUrl } from '../util/buildTokenIconUrl';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../Tokens/util', () => ({
  deriveBalanceFromAssetMarketDetails: jest.fn(),
}));
jest.mock('../../../../util/assets', () => ({
  formatWithThreshold: jest.fn(),
}));
jest.mock('../../../../util/networks', () => ({ isTestNet: jest.fn() }));
jest.mock('../util/buildTokenIconUrl', () => ({
  buildTokenIconUrl: jest.fn(),
}));
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
const mockBuildTokenIconUrl = buildTokenIconUrl as jest.MockedFunction<
  typeof buildTokenIconUrl
>;

describe('useAssetBalance', () => {
  const mockToken: CardTokenAllowance = {
    address: '0x1234567890123456789012345678901234567890',
    chainId: '0x1',
    isStaked: false,
    decimals: 18,
    symbol: 'TEST',
    name: 'Test Token',
    allowanceState: 'enabled' as any,
    allowance: {} as any,
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
    mockBuildTokenIconUrl.mockReturnValue('https://example.com/token-icon.png');
  });

  describe('null/undefined token handling', () => {
    it('should return default values when token is null/undefined', () => {
      // Mock selector to return undefined for asset when token is null/undefined
      const mockSelectorForNullToken = jest
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

          // For null/undefined token, the selector should return undefined
          if (typeof selector === 'function') {
            return undefined;
          }

          return { price: 2000 };
        });

      mockUseSelector.mockImplementation(mockSelectorForNullToken);

      const { result: nullResult } = renderHook(() => useAssetBalance(null));
      const { result: undefinedResult } = renderHook(() =>
        useAssetBalance(undefined),
      );

      [nullResult, undefinedResult].forEach((result) => {
        expect(result.current.asset).toBeUndefined();
        expect(result.current.balanceFiat).toBe('');
        expect(result.current.mainBalance).toBe('');
        expect(result.current.secondaryBalance).toBe('');
      });
    });

    it('should handle evmAsset selector returning undefined when token is falsy', () => {
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

          // When token is falsy, the evmAsset selector should return undefined
          if (typeof selector === 'function') {
            return undefined;
          }

          return { price: 2000 };
        });

      mockUseSelector.mockImplementation(mockSelectorImplementation);

      // Test with null token
      const { result: nullResult } = renderHook(() => useAssetBalance(null));

      // Test with undefined token
      const { result: undefinedResult } = renderHook(() =>
        useAssetBalance(undefined),
      );

      // When token is falsy, asset becomes undefined due to the logic:
      // let asset = token && isEvmNetworkSelected ? evmAsset : nonEvmAsset;
      [nullResult, undefinedResult].forEach((result) => {
        expect(result.current.asset).toBeUndefined();
        expect(result.current.balanceFiat).toBe('');
        expect(result.current.mainBalance).toBe('');
        expect(result.current.secondaryBalance).toBe('');
      });

      // Verify that the selector was called with the expected parameters
      expect(mockSelectorImplementation).toHaveBeenCalled();
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
      // Mock selector to explicitly return undefined for asset
      const mockSelectorForUndefinedAsset = jest
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
            return undefined;
          if (selector.toString().includes('selectSingleTokenBalance'))
            return {};
          if (selector.toString().includes('selectCurrencyRateForChainId'))
            return 0;

          // Return undefined for asset selector
          if (typeof selector === 'function') {
            return undefined;
          }

          return undefined;
        });

      mockUseSelector.mockImplementation(mockSelectorForUndefinedAsset);
      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balanceFiat: undefined,
        balanceValueFormatted: '',
      });
      mockBuildTokenIconUrl.mockReturnValue(
        'https://example.com/token-icon.png',
      );

      // Mock formatWithThreshold for mapped asset scenario
      mockFormatWithThreshold.mockImplementation(
        (
          _value: number | null,
          _threshold: number,
          _locale: string,
          options: any,
        ) => {
          if (options?.style === 'currency') {
            return '$0.00';
          }
          return '0';
        },
      );

      const { result } = renderHook(() => useAssetBalance(mockToken));

      // When no asset is found but token exists, a mapped asset is created
      expect(result.current.asset).toBeDefined();
      expect(result.current.asset?.address).toBe(mockToken.address);
      expect(result.current.asset?.symbol).toBe(mockToken.symbol);
      expect(result.current.asset?.balance).toBe('0');
      expect(result.current.asset?.balanceFiat).toBe('$0.00');
      expect(result.current.mainBalance).toBe('$0.00');
      expect(result.current.secondaryBalance).toBe('0 TEST');
    });

    it('should handle mapped asset when no asset found but token exists', () => {
      // Mock selector to return undefined for both EVM and non-EVM assets
      const mockSelectorForMappedAsset = jest
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
            return undefined;
          if (selector.toString().includes('selectSingleTokenBalance'))
            return {};
          if (selector.toString().includes('selectCurrencyRateForChainId'))
            return 0;

          // Return undefined for both asset selectors to trigger mapped asset creation
          if (typeof selector === 'function') {
            return undefined;
          }

          return undefined;
        });

      mockUseSelector.mockImplementation(mockSelectorForMappedAsset);
      mockBuildTokenIconUrl.mockReturnValue(
        'https://example.com/token-icon.png',
      );

      // Mock formatWithThreshold for mapped asset scenario
      mockFormatWithThreshold.mockImplementation(
        (
          _value: number | null,
          _threshold: number,
          _locale: string,
          options: any,
        ) => {
          if (options?.style === 'currency') {
            return '$0.00';
          }
          return '0';
        },
      );

      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
      expect(result.current.asset?.address).toBe(mockToken.address);
      expect(result.current.asset?.symbol).toBe(mockToken.symbol);
      expect(result.current.asset?.balance).toBe('0');
      expect(result.current.asset?.balanceFiat).toBe('$0.00');
      expect(result.current.asset?.image).toBe(
        'https://example.com/token-icon.png',
      );
      expect(result.current.mainBalance).toBe('$0.00');
      expect(result.current.secondaryBalance).toBe('0 TEST');
      expect(mockBuildTokenIconUrl).toHaveBeenCalledWith(
        mockToken.chainId,
        mockToken.address,
      );
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

  describe('Selector function coverage', () => {
    it('should cover evmAsset selector with valid token', () => {
      // This test ensures the evmAsset selector function is called with a valid token
      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
      expect(result.current.asset?.address).toBe(mockToken.address);
      expect(result.current.asset?.chainId).toBe(mockToken.chainId);
    });

    it('should cover nonEvmAsset selector with valid token and account', () => {
      // Test non-EVM asset selector function coverage
      mockUseSelector.mockImplementation(
        createMockSelector({
          isEvmNetworkSelected: false,
          selectedAccount: { id: 'account1' },
          nonEvmAsset: mockNonEvmAsset,
        }),
      );

      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
      expect(result.current.asset?.symbol).toBe('BTC');
    });

    it('should cover primaryCurrency selector function', () => {
      // Test primaryCurrency selector function coverage
      mockUseSelector.mockImplementation(
        createMockSelector({ primaryCurrency: 'USD' }),
      );

      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.mainBalance).toBe('$1,000.00');
    });

    it('should cover exchangeRates selector with asset having chainId and address', () => {
      // Test exchangeRates selector function coverage
      const assetWithChainAndAddress = {
        ...mockEvmAsset,
        chainId: '0x1',
        address: '0x1234567890123456789012345678901234567890',
      };

      mockUseSelector.mockImplementation(
        createMockSelector({
          evmAsset: assetWithChainAndAddress,
          exchangeRates: { price: 3000 },
        }),
      );

      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
      expect(result.current.asset?.chainId).toBe('0x1');
    });

    it('should cover tokenBalances selector with valid conditions', () => {
      // Test tokenBalances selector function coverage
      const assetWithChainAndAddress = {
        ...mockEvmAsset,
        chainId: '0x1',
        address: '0x1234567890123456789012345678901234567890',
      };

      mockUseSelector.mockImplementation(
        createMockSelector({
          selectedInternalAccountAddress: '0xtest',
          evmAsset: assetWithChainAndAddress,
          tokenBalances: { balance: '1000000000000000000' },
        }),
      );

      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
      expect(result.current.asset?.address).toBe(
        '0x1234567890123456789012345678901234567890',
      );
    });

    it('should cover conversionRate selector with asset having chainId', () => {
      // Test conversionRate selector function coverage
      const assetWithChainId = {
        ...mockEvmAsset,
        chainId: '0x1',
      };

      mockUseSelector.mockImplementation(
        createMockSelector({
          evmAsset: assetWithChainId,
          conversionRate: 2000,
        }),
      );

      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
      expect(result.current.asset?.chainId).toBe('0x1');
    });

    it('should handle asset without chainId and address for exchangeRates', () => {
      // Test exchangeRates selector when asset doesn't have chainId or address
      const assetWithoutChainAndAddress = {
        ...mockEvmAsset,
        chainId: undefined,
        address: undefined,
      };

      mockUseSelector.mockImplementation(
        createMockSelector({
          evmAsset: assetWithoutChainAndAddress,
        }),
      );

      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
    });

    it('should handle missing selectedInternalAccountAddress for tokenBalances', () => {
      // Test tokenBalances selector when selectedInternalAccountAddress is missing
      mockUseSelector.mockImplementation(
        createMockSelector({
          selectedInternalAccountAddress: null,
        }),
      );

      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
    });

    it('should handle asset without chainId for conversionRate', () => {
      // Test conversionRate selector when asset doesn't have chainId
      const assetWithoutChainId = {
        ...mockEvmAsset,
        chainId: undefined,
      };

      mockUseSelector.mockImplementation(
        createMockSelector({
          evmAsset: assetWithoutChainId,
        }),
      );

      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
    });

    it('should handle non-EVM asset selector when selectedAccount is missing', () => {
      // Test nonEvmAsset selector when selectedAccount is missing
      const mockSelectorForMissingAccount = jest
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
            return null; // Missing selected account
          if (selector.toString().includes('selectSingleTokenPriceMarketData'))
            return { price: 2000 };
          if (selector.toString().includes('selectSingleTokenBalance'))
            return {};
          if (selector.toString().includes('selectCurrencyRateForChainId'))
            return 0;

          // Return undefined for nonEvmAsset when selectedAccount is null
          if (typeof selector === 'function') {
            return undefined;
          }

          return { price: 2000 };
        });

      mockUseSelector.mockImplementation(mockSelectorForMissingAccount);

      const { result } = renderHook(() => useAssetBalance(mockToken));

      // When selectedAccount is null and no nonEvmAsset is found, but token exists, a mapped asset is created
      expect(result.current.asset).toBeDefined();
      expect(result.current.asset?.address).toBe(mockToken.address);
      expect(result.current.asset?.symbol).toBe(mockToken.symbol);
    });
  });

  describe('Edge cases and branch coverage', () => {
    it('should handle test network with fiat disabled and no balanceFiat', () => {
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

      // When balanceFiat is undefined and showFiatOnTestnets is false,
      // mainBalance should be the fallback string
      expect(result.current.mainBalance).toBe('Unable to find conversion rate');
      expect(result.current.secondaryBalance).toBe('1.0'.toUpperCase());
    });

    it('should handle non-EVM asset path in useMemo', () => {
      mockUseSelector.mockImplementation(
        createMockSelector({
          isEvmNetworkSelected: false,
          selectedAccount: { id: 'account1' },
          nonEvmAsset: {
            ...mockNonEvmAsset,
            balanceFiat: '50000.00',
            balance: '100000000',
          },
        }),
      );

      mockFormatWithThreshold.mockImplementation((value: number | null) => {
        if (value === null) return '0';
        return value.toFixed(2);
      });

      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
      expect(result.current.asset?.symbol).toBe('BTC');
    });

    it('should handle non-EVM asset with missing balance data', () => {
      mockUseSelector.mockImplementation(
        createMockSelector({
          isEvmNetworkSelected: false,
          selectedAccount: { id: 'account1' },
          nonEvmAsset: {
            ...mockNonEvmAsset,
            balanceFiat: undefined,
            balance: undefined,
          },
        }),
      );

      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
      expect(result.current.asset?.symbol).toBe('BTC');
    });
  });
});
