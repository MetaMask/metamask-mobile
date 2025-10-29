/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useAssetBalance } from './useAssetBalance';
import { CardTokenAllowance } from '../types';
import { CaipChainId } from '@metamask/utils';
import { TOKEN_RATE_UNDEFINED } from '../../Tokens/constants';
import { deriveBalanceFromAssetMarketDetails } from '../../Tokens/util';
import { formatWithThreshold } from '../../../../util/assets';
import { isTestNet } from '../../../../util/networks';
import { buildTokenIconUrl } from '../util/buildTokenIconUrl';
import { selectAsset } from '../../../../selectors/assets/assets-list';
import { useTokensWithBalance } from '../../Bridge/hooks/useTokensWithBalance';

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
jest.mock('../../../../selectors/assets/assets-list', () => ({
  selectAsset: jest.fn(),
}));
jest.mock('../../../../selectors/multichainNetworkController', () => ({
  selectIsEvmNetworkSelected: jest.fn(),
}));
jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn(),
  selectSelectedInternalAccountAddress: jest.fn(),
  selectSelectedInternalAccountFormattedAddress: jest.fn(() => '0xtest'),
}));
jest.mock('../../../../selectors/accountTrackerController', () => ({
  selectAccountsByChainId: jest.fn(() => ({})),
  selectAccounts: jest.fn(() => ({})),
  selectAccountsLength: jest.fn(() => 0),
  selectAccountBalanceByChainId: jest.fn(),
}));
jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrencyRateForChainId: jest.fn(),
  selectCurrentCurrency: jest.fn(),
  selectCurrencyRates: jest.fn(() => ({})),
}));
jest.mock('../../../../selectors/settings', () => ({
  selectShowFiatInTestnets: jest.fn(),
  selectPrimaryCurrency: jest.fn(() => 'ETH'),
}));
jest.mock('../../../../selectors/tokenRatesController', () => ({
  selectSingleTokenPriceMarketData: jest.fn(),
}));
jest.mock('../../../../selectors/tokenBalancesController', () => ({
  selectSingleTokenBalance: jest.fn(),
}));
jest.mock('../../Bridge/hooks/useTokensWithBalance', () => ({
  useTokensWithBalance: jest.fn(() => []),
}));
jest.mock('../../../../selectors/networkController', () => ({
  selectAllPopularNetworkConfigurations: jest.fn(() => ({
    mainnet: { chainId: '0x1' },
    polygon: { chainId: '0x89' },
    optimism: { chainId: '0xa' },
    arbitrum: { chainId: '0xa4b1' },
  })),
  selectEvmChainId: jest.fn(() => '0x1'),
  selectEvmNetworkConfigurationsByChainId: jest.fn(() => ({
    '0x1': { chainId: '0x1', name: 'Mainnet' },
  })),
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
jest.mock('../../../../core/Engine', () => ({
  context: {
    MultichainAssetsRatesController: {
      state: {
        conversionRates: {},
      },
    },
  },
}));
jest.mock('@metamask/bridge-controller', () => ({
  isSolanaChainId: jest.fn(() => false),
}));
jest.mock('@metamask/swaps-controller/dist/constants', () => ({
  LINEA_CHAIN_ID: '0xe708',
}));
jest.mock('../../Ramp/Deposit/constants/networks', () => ({
  SOLANA_MAINNET: { chainId: 'solana:mainnet' },
}));
jest.mock('../../../../util/number', () => ({
  addCurrencySymbol: jest.fn((value: string) => `$${value}`),
  balanceToFiatNumber: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectAsset = selectAsset as jest.MockedFunction<typeof selectAsset>;
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
const mockUseTokensWithBalance = useTokensWithBalance as jest.MockedFunction<
  typeof useTokensWithBalance
>;

describe('useAssetBalance', () => {
  const mockToken: CardTokenAllowance = {
    address: '0x1234567890123456789012345678901234567890',
    chainId: '0x1',
    caipChainId: 'eip155:1' as CaipChainId,
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
    aggregators: [],
    image: 'https://example.com/test.png',
    logo: 'https://example.com/test.png',
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
    aggregators: [],
    image: 'https://example.com/btc.png',
    logo: 'https://example.com/btc.png',
  };

  let useSelectorCallCount = 0;

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
        popularNetworks: {
          mainnet: { chainId: '0x1' },
          polygon: { chainId: '0x89' },
          optimism: { chainId: '0xa' },
          arbitrum: { chainId: '0xa4b1' },
        },
        ...overrides,
      };

      useSelectorCallCount++;

      // If selector is a function, this could be either:
      // 1. The inline selector for asset (odd calls: 1, 3, 5...)
      // 2. The assetBalanceSelector from createSelector (even calls: 2, 4, 6...)
      if (typeof selector === 'function') {
        if (useSelectorCallCount % 2 === 1) {
          // Odd call: inline selector that calls selectAsset
          // Return the value that was set via mockSelectAsset.mockReturnValue()
          return mockSelectAsset();
        }
          // Even call: assetBalanceSelector - return mocked balance info
          return {
            primaryCurrency: defaults.primaryCurrency,
            showFiatOnTestnets: defaults.showFiatOnTestnets,
            conversionRate: overrides.conversionRate ?? 0,
            exchangeRates: overrides.exchangeRates ?? defaults.exchangeRates,
            currentCurrency: defaults.currentCurrency,
          };

      }

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
      if (selector.toString().includes('selectAllPopularNetworkConfigurations'))
        return defaults.popularNetworks;

      return defaults.exchangeRates;
    };

  beforeEach(() => {
    jest.clearAllMocks();
    useSelectorCallCount = 0; // Reset call count for each test
    mockUseSelector.mockImplementation(createMockSelector());
    // Set default but allow tests to override with mockReturnValue
    mockSelectAsset.mockReturnValue(mockEvmAsset);
    mockUseTokensWithBalance.mockReturnValue([]);
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
      // Given: token is null or undefined, selector should return undefined
      mockSelectAsset.mockReturnValue(undefined);

      // When token is null/undefined, the hook returns early with empty values
      const { result: nullResult } = renderHook(() => useAssetBalance(null));
      const { result: undefinedResult } = renderHook(() =>
        useAssetBalance(undefined),
      );

      // Then: should return default empty values
      [nullResult, undefinedResult].forEach((result) => {
        expect(result.current.asset).toBeUndefined();
        expect(result.current.balanceFiat).toBe('');
        expect(result.current.mainBalance).toBe('');
        expect(result.current.secondaryBalance).toBe('');
      });
    });

    it('should handle evmAsset selector returning undefined when token is falsy', () => {
      // Given: token is null/undefined, selector should return undefined
      mockSelectAsset.mockReturnValue(undefined);

      // The hook checks if (!asset || !token) and returns empty values
      const { result: nullResult } = renderHook(() => useAssetBalance(null));
      const { result: undefinedResult } = renderHook(() =>
        useAssetBalance(undefined),
      );

      // Then: asset should be undefined and balances should be empty
      [nullResult, undefinedResult].forEach((result) => {
        expect(result.current.asset).toBeUndefined();
        expect(result.current.balanceFiat).toBe('');
        expect(result.current.mainBalance).toBe('');
        expect(result.current.secondaryBalance).toBe('');
      });
    });
  });

  describe('EVM assets', () => {
    it('should handle EVM asset with ETH primary currency', () => {
      mockSelectAsset.mockReturnValue(mockEvmAsset);
      mockUseSelector.mockImplementation(
        createMockSelector({ primaryCurrency: 'ETH' }),
      );
      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
      // When primaryCurrency is 'ETH': mainBalance = balanceValueFormatted (asset.balance)
      expect(result.current.mainBalance).toBe('1000000000000000000');
      // secondaryBalance = balanceFiat
      expect(result.current.secondaryBalance).toBe('1000.00');
    });

    it('should handle EVM asset with fiat primary currency', () => {
      mockSelectAsset.mockReturnValue(mockEvmAsset);
      mockUseSelector.mockImplementation(
        createMockSelector({ primaryCurrency: 'USD' }),
      );
      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
      // mainBalance = balanceFiat = asset.balanceFiat
      expect(result.current.mainBalance).toBe('1000.00');
      // secondaryBalance = balanceValueFormatted = asset.balance
      expect(result.current.secondaryBalance).toBe('1000000000000000000');
    });

    it('should handle ETH native token correctly', () => {
      const ethAsset = { ...mockEvmAsset, isETH: true };
      mockSelectAsset.mockReturnValue(ethAsset);
      mockUseSelector.mockImplementation(
        createMockSelector({
          primaryCurrency: 'ETH',
        }),
      );
      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
      // For ETH: mainBalance = balanceValueFormatted
      expect(result.current.mainBalance).toBe('1000000000000000000');
      // secondaryBalance = balanceFiat
      expect(result.current.secondaryBalance).toBe('1000.00');
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
          if (
            selector
              .toString()
              .includes('selectAllPopularNetworkConfigurations')
          )
            return {
              mainnet: { chainId: '0x1' },
              polygon: { chainId: '0x89' },
              optimism: { chainId: '0xa' },
              arbitrum: { chainId: '0xa4b1' },
            };

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
      // Given: selectAsset returns undefined, simulating asset not found
      mockSelectAsset.mockReturnValue(undefined);

      // When: useTokensWithBalance returns a filtered token
      const filteredToken = {
        address: mockToken.address.toLowerCase(),
        chainId: mockToken.chainId as string,
        balance: '0',
        balanceFiat: '0',
        symbol: mockToken.symbol || 'TEST',
        decimals: mockToken.decimals || 18,
      } as any;
      mockUseTokensWithBalance.mockReturnValue([filteredToken]);

      const { result } = renderHook(() => useAssetBalance(mockToken));

      // Then: a mapped asset should be created from the token
      expect(result.current.asset).toBeDefined();
      expect(result.current.asset?.address).toBe(mockToken.address);
      expect(result.current.asset?.symbol).toBe(mockToken.symbol);
      expect(result.current.asset?.balance).toBe('0');
      expect(result.current.asset?.balanceFiat).toBe('0');
    });

    it('should handle mapped asset when no asset found but token exists', () => {
      // Given: selectAsset returns undefined, no asset found
      mockSelectAsset.mockReturnValue(undefined);
      mockBuildTokenIconUrl.mockReturnValue(
        'https://example.com/token-icon.png',
      );

      // When: useTokensWithBalance returns a filtered token
      const filteredToken = {
        address: mockToken.address.toLowerCase(),
        chainId: mockToken.chainId as string,
        balance: '0',
        balanceFiat: '0',
        symbol: mockToken.symbol || 'TEST',
        decimals: mockToken.decimals || 18,
      } as any;
      mockUseTokensWithBalance.mockReturnValue([filteredToken]);

      const { result } = renderHook(() => useAssetBalance(mockToken));

      // Then: mapped asset should be created with token properties
      expect(result.current.asset).toBeDefined();
      expect(result.current.asset?.address).toBe(mockToken.address);
      expect(result.current.asset?.symbol).toBe(mockToken.symbol);
      expect(result.current.asset?.balance).toBe('0');
      expect(result.current.asset?.balanceFiat).toBe('0');
      expect(result.current.asset?.image).toBe(
        'https://example.com/token-icon.png',
      );
      expect(mockBuildTokenIconUrl).toHaveBeenCalledWith(
        mockToken.caipChainId,
        mockToken.address,
      );
    });
  });

  describe('Test network scenarios', () => {
    it('should handle test network with fiat disabled for ETH', () => {
      mockIsTestNet.mockReturnValue(true);
      const ethAsset = { ...mockEvmAsset, isETH: true };
      mockSelectAsset.mockReturnValue(ethAsset);
      mockUseSelector.mockImplementation(
        createMockSelector({
          primaryCurrency: 'ETH',
          showFiatOnTestnets: false,
        }),
      );
      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
      // With primaryCurrency 'ETH': mainBalance = balanceValueFormatted
      expect(result.current.mainBalance).toBe('1000000000000000000');
      // With showFiatOnTestnets false and isETH: secondaryBalance = undefined (line 213-215)
      expect(result.current.secondaryBalance).toBeUndefined();
    });

    it('should handle test network with fiat disabled for USD primary currency', () => {
      mockIsTestNet.mockReturnValue(true);
      const assetWithoutFiat = { ...mockEvmAsset, balanceFiat: undefined };
      mockSelectAsset.mockReturnValue(assetWithoutFiat);
      mockUseSelector.mockImplementation(
        createMockSelector({
          primaryCurrency: 'USD',
          showFiatOnTestnets: false,
        }),
      );
      const { result } = renderHook(() => useAssetBalance(mockToken));

      // When balanceFiat is undefined and showFiatOnTestnets is false, mainBalance is undefined (line 219-220)
      expect(result.current.mainBalance).toBeUndefined();
      expect(result.current.secondaryBalance).toBe('1000000000000000000');
    });
  });

  describe('Special cases', () => {
    it('should handle TOKEN_RATE_UNDEFINED', () => {
      // Given: asset with TOKEN_RATE_UNDEFINED balanceFiat
      const assetWithUndefinedRate = {
        ...mockEvmAsset,
        balanceFiat: TOKEN_RATE_UNDEFINED,
      };
      mockSelectAsset.mockReturnValue(assetWithUndefinedRate);
      const { result } = renderHook(() => useAssetBalance(mockToken));

      // When balanceFiat is TOKEN_RATE_UNDEFINED, mainBalance = balanceValueFormatted
      expect(result.current.mainBalance).toBe('1000000000000000000');
      expect(result.current.secondaryBalance).toBe(
        'Unable to find conversion rate',
      );
    });

    it('should handle balance error precedence over TOKEN_RATE_UNDEFINED', () => {
      // Given: asset with both balance error and TOKEN_RATE_UNDEFINED
      const errorAsset = {
        ...mockEvmAsset,
        hasBalanceError: true,
        symbol: 'TEST',
        balanceFiat: TOKEN_RATE_UNDEFINED,
      };
      mockSelectAsset.mockReturnValue(errorAsset);
      const { result } = renderHook(() => useAssetBalance(mockToken));

      // hasBalanceError takes precedence, so mainBalance = asset.symbol
      expect(result.current.mainBalance).toBe('TEST');
      expect(result.current.secondaryBalance).toBe('Unable to load');
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
        balanceFiat: '1000.00',
        isStaked: false,
      });
      expect(result.current.balanceFiat).toBe('1000.00');
      expect(result.current.mainBalance).toBe('1000.00');
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
      mockSelectAsset.mockReturnValue(mockNonEvmAsset);
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

      // With USD primary currency, mainBalance = balanceFiat = asset.balanceFiat
      expect(result.current.mainBalance).toBe('1000.00');
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
      // Given: selectAsset returns undefined (simulating missing account scenario)
      mockSelectAsset.mockReturnValue(undefined);

      // When: useTokensWithBalance returns a filtered token for the asset
      const filteredToken = {
        address: mockToken.address.toLowerCase(),
        chainId: mockToken.chainId as string,
        balance: '0',
        balanceFiat: '0',
        symbol: mockToken.symbol || 'TEST',
        decimals: mockToken.decimals || 18,
      } as any;
      mockUseTokensWithBalance.mockReturnValue([filteredToken]);

      const { result } = renderHook(() => useAssetBalance(mockToken));

      // Then: a mapped asset is created from the token
      expect(result.current.asset).toBeDefined();
      expect(result.current.asset?.address).toBe(mockToken.address);
      expect(result.current.asset?.symbol).toBe(mockToken.symbol);
    });
  });

  describe('availableBalance handling (authenticated card scenario)', () => {
    beforeEach(() => {
      const { isSolanaChainId } = jest.requireMock(
        '@metamask/bridge-controller',
      );
      // Reset isSolanaChainId to false for EVM tests
      isSolanaChainId.mockReturnValue(false);
      // Clear the mock to ensure clean state for each test
      mockDeriveBalanceFromAssetMarketDetails.mockClear();
    });

    it('returns calculated balance for EVM token with availableBalance', () => {
      const tokenWithAvailableBalance: CardTokenAllowance = {
        ...mockToken,
        availableBalance: '500.50',
        chainId: '0x1',
      };

      mockSelectAsset.mockReturnValue(mockEvmAsset);
      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balance: '500.50',
        balanceFiat: '$1,001.00',
        balanceValueFormatted: '500.50 TEST',
        balanceFiatCalculation: 1001,
      });

      const { result } = renderHook(() =>
        useAssetBalance(tokenWithAvailableBalance),
      );

      expect(result.current.asset).toBeDefined();
      expect(result.current.asset?.balance).toBe('500.50');
      expect(result.current.balanceFiat).toBe('$1,001.00');
      expect(result.current.rawTokenBalance).toBe(500.5);
      expect(result.current.rawFiatNumber).toBe(1001);
    });

    it('calculates balance for Solana token with availableBalance and conversion rate', () => {
      const { isSolanaChainId } = jest.requireMock(
        '@metamask/bridge-controller',
      );
      isSolanaChainId.mockReturnValue(true);

      const solanaToken: CardTokenAllowance = {
        ...mockToken,
        availableBalance: '100.5',
        chainId: 'solana:mainnet',
        address: '0xSolanaToken',
      };

      const mockEngine = jest.requireMock('../../../../core/Engine');
      mockEngine.context.MultichainAssetsRatesController.state.conversionRates =
        {
          'solana:mainnet/token:0xSolanaToken': {
            rate: '50',
          },
        };

      const { balanceToFiatNumber } = jest.requireMock(
        '../../../../util/number',
      );
      balanceToFiatNumber.mockReturnValue('5025');

      mockSelectAsset.mockReturnValue({
        ...mockEvmAsset,
        address: '0xSolanaToken',
        chainId: 'solana:mainnet',
        symbol: 'SOL',
      });

      const { result } = renderHook(() => useAssetBalance(solanaToken));

      expect(result.current.asset).toBeDefined();
      expect(result.current.balanceFiat).toBe('$5025');
      expect(result.current.rawFiatNumber).toBeUndefined();
      expect(balanceToFiatNumber).toHaveBeenCalledWith('100.5', 50, 1);
    });

    it('falls back to balance + symbol for Solana token without conversion rate', () => {
      const { isSolanaChainId } = jest.requireMock(
        '@metamask/bridge-controller',
      );
      isSolanaChainId.mockReturnValue(true);

      const solanaToken: CardTokenAllowance = {
        ...mockToken,
        availableBalance: '100.5',
        chainId: 'solana:mainnet',
        address: '0xSolanaTokenNoRate',
        symbol: 'SOLTKN',
      };

      const mockEngine = jest.requireMock('../../../../core/Engine');
      mockEngine.context.MultichainAssetsRatesController.state.conversionRates =
        {};

      mockSelectAsset.mockReturnValue({
        ...mockEvmAsset,
        address: '0xSolanaTokenNoRate',
        chainId: 'solana:mainnet',
        symbol: 'SOLTKN',
      });

      const { result } = renderHook(() => useAssetBalance(solanaToken));

      expect(result.current.asset).toBeDefined();
      expect(result.current.balanceFiat).toBe('100.5 SOLTKN');
      expect(result.current.rawFiatNumber).toBeUndefined();
    });

    it('parses rawTokenBalance correctly when balance has currency symbols', () => {
      const tokenWithAvailableBalance: CardTokenAllowance = {
        ...mockToken,
        availableBalance: '1,234.56',
        chainId: '0x1',
      };

      mockSelectAsset.mockReturnValue(mockEvmAsset);
      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balance: '1234.56',
        balanceFiat: '$2,469.12',
        balanceValueFormatted: '1,234.56 TEST',
        balanceFiatCalculation: 2469.12,
      });

      const { result } = renderHook(() =>
        useAssetBalance(tokenWithAvailableBalance),
      );

      // rawTokenBalance should strip non-numeric characters except decimal point
      expect(result.current.rawTokenBalance).toBe(1234.56);
      expect(result.current.rawFiatNumber).toBe(2469.12);
    });

    it('handles non-numeric balance in derived balance calculation', () => {
      const tokenWithAvailableBalance: CardTokenAllowance = {
        ...mockToken,
        availableBalance: '100',
        chainId: '0x1',
      };

      mockSelectAsset.mockReturnValue(mockEvmAsset);
      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balance: 'N/A',
        balanceFiat: '$200.00',
        balanceValueFormatted: '100 TEST',
        balanceFiatCalculation: 200,
      });

      const { result } = renderHook(() =>
        useAssetBalance(tokenWithAvailableBalance),
      );

      // When balance is non-numeric after regex, parseFloat returns NaN
      expect(result.current.rawTokenBalance).toBeNaN();
      expect(result.current.rawFiatNumber).toBe(200);
    });

    it('resets balanceFiat and recalculates when availableBalance is set', () => {
      const tokenWithAvailableBalance: CardTokenAllowance = {
        ...mockToken,
        availableBalance: '250.75',
        chainId: '0x1',
      };

      const assetWithOldBalance = {
        ...mockEvmAsset,
        balance: '1000',
        balanceFiat: '$1000.00',
      };

      mockSelectAsset.mockReturnValue(assetWithOldBalance);

      // Clear previous calls and set new return value
      mockDeriveBalanceFromAssetMarketDetails.mockClear();
      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balance: '250.75',
        balanceFiat: '$501.50',
        balanceValueFormatted: '250.75 TEST',
        balanceFiatCalculation: 501.5,
      });

      const { result } = renderHook(() =>
        useAssetBalance(tokenWithAvailableBalance),
      );

      // The asset balance should be updated to availableBalance
      expect(result.current.asset?.balance).toBe('250.75');
      // The new balanceFiat should be from the recalculation
      expect(result.current.balanceFiat).toBe('$501.50');
      // deriveBalanceFromAssetMarketDetails should be called to recalculate fiat
      expect(mockDeriveBalanceFromAssetMarketDetails).toHaveBeenCalledTimes(1);
    });

    it('handles zero availableBalance correctly', () => {
      const tokenWithZeroBalance: CardTokenAllowance = {
        ...mockToken,
        availableBalance: '0',
        chainId: '0x1',
      };

      mockSelectAsset.mockReturnValue(mockEvmAsset);
      mockDeriveBalanceFromAssetMarketDetails.mockClear();
      mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
        balance: '0',
        balanceFiat: '$0.00',
        balanceValueFormatted: '0 TEST',
        balanceFiatCalculation: 0,
      });

      const { result } = renderHook(() =>
        useAssetBalance(tokenWithZeroBalance),
      );

      expect(result.current.asset?.balance).toBe('0');
      expect(result.current.balanceFiat).toBe('$0.00');
      expect(result.current.rawTokenBalance).toBe(0);
      expect(result.current.rawFiatNumber).toBe(0);
    });
  });

  describe('Edge cases and branch coverage', () => {
    it('should handle test network with fiat disabled and no balanceFiat', () => {
      // Reset mocks to ensure clean state
      jest.clearAllMocks();
      useSelectorCallCount = 0;

      mockIsTestNet.mockReturnValue(true);
      const assetWithoutFiat = {
        ...mockEvmAsset,
        balanceFiat: undefined,
        balance: '1000000000000000000',
      };
      mockSelectAsset.mockReturnValue(assetWithoutFiat);
      mockUseSelector.mockImplementation(
        createMockSelector({
          primaryCurrency: 'USD',
          showFiatOnTestnets: false,
        }),
      );

      const { result } = renderHook(() => useAssetBalance(mockToken));

      // When balanceFiat is undefined and showFiatOnTestnets is false, mainBalance is undefined
      expect(result.current.mainBalance).toBeUndefined();
      expect(result.current.secondaryBalance).toBe('1000000000000000000');
    });

    it('should handle non-EVM asset path in useMemo', () => {
      const nonEvmAssetWithBalance = {
        ...mockNonEvmAsset,
        balanceFiat: '50000.00',
        balance: '100000000',
      };
      mockSelectAsset.mockReturnValue(nonEvmAssetWithBalance);
      mockUseSelector.mockImplementation(
        createMockSelector({
          isEvmNetworkSelected: false,
          selectedAccount: { id: 'account1' },
          nonEvmAsset: nonEvmAssetWithBalance,
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
      const nonEvmAssetMissingData = {
        ...mockNonEvmAsset,
        balanceFiat: '',
        balance: '',
      };
      mockSelectAsset.mockReturnValue(nonEvmAssetMissingData);
      mockUseSelector.mockImplementation(
        createMockSelector({
          isEvmNetworkSelected: false,
          selectedAccount: { id: 'account1' },
          nonEvmAsset: nonEvmAssetMissingData,
        }),
      );

      const { result } = renderHook(() => useAssetBalance(mockToken));

      expect(result.current.asset).toBeDefined();
      expect(result.current.asset?.symbol).toBe('BTC');
    });
  });
});
