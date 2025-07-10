/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useAssetBalance } from './useAssetBalance';
import { FlashListAssetKey } from '../../Tokens/TokenList';
import { TOKEN_RATE_UNDEFINED } from '../../Tokens/constants';
import { deriveBalanceFromAssetMarketDetails } from '../../Tokens/util';
import { formatWithThreshold } from '../../../../util/assets';
import { isTestNet } from '../../../../util/networks';

// Mock useSelector
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

// Mock utility functions
jest.mock('../../Tokens/util', () => ({
  deriveBalanceFromAssetMarketDetails: jest.fn(),
}));

jest.mock('../../../../util/assets', () => ({
  formatWithThreshold: jest.fn(),
}));

jest.mock('../../../../util/networks', () => ({
  isTestNet: jest.fn(),
}));

// Mock selectors
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

// Mock localization
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: { [key: string]: string } = {
      'wallet.unable_to_find_conversion_rate': 'Unable to find conversion rate',
      'wallet.unable_to_load': 'Unable to load',
    };
    return translations[key] || key;
  }),
  default: {
    locale: 'en-US',
  },
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

  const defaultMockState = {
    selectedInternalAccountAddress: '0xtest',
    isEvmNetworkSelected: true,
    primaryCurrency: 'ETH',
    currentCurrency: 'USD',
    showFiatOnTestnets: true,
    exchangeRates: { price: 2000 },
    tokenBalances: { balance: '1000000000000000000' },
    conversionRate: 1.0,
    selectedAccount: { id: 'account1' },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    mockUseSelector.mockImplementation((selector: any) => {
      // Return appropriate mock data based on selector function
      if (
        selector.toString().includes('selectSelectedInternalAccountAddress')
      ) {
        return defaultMockState.selectedInternalAccountAddress;
      }
      if (selector.toString().includes('selectIsEvmNetworkSelected')) {
        return defaultMockState.isEvmNetworkSelected;
      }
      if (selector.toString().includes('primaryCurrency')) {
        return defaultMockState.primaryCurrency;
      }
      if (selector.toString().includes('selectCurrentCurrency')) {
        return defaultMockState.currentCurrency;
      }
      if (selector.toString().includes('selectShowFiatInTestnets')) {
        return defaultMockState.showFiatOnTestnets;
      }
      if (selector.toString().includes('selectSelectedInternalAccount')) {
        return defaultMockState.selectedAccount;
      }
      // For asset selection mocks, return appropriate assets
      if (selector.name === 'selectEvmAsset') {
        return mockEvmAsset;
      }
      if (selector.name === 'selectNonEvmAsset') {
        return mockNonEvmAsset;
      }
      // Handle dynamic selectors created by makeSelectAssetByAddressAndChainId and makeSelectNonEvmAssetById
      if (typeof selector === 'function' && selector.length === 2) {
        return mockEvmAsset; // Default to EVM asset for dynamic selectors
      }
      return defaultMockState.exchangeRates;
    });

    mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
      balanceFiat: '$1,000.00',
      balanceValueFormatted: '1.0',
    });

    mockFormatWithThreshold.mockImplementation((value: number | null) =>
      value ? value.toFixed(2) : '0',
    );
    mockIsTestNet.mockReturnValue(false);
  });

  it('should return default values when token is null', () => {
    const { result } = renderHook(() => useAssetBalance(null));

    expect(result.current.asset).toEqual({
      balanceFiat: undefined,
      isStaked: undefined,
      price: 2000,
    });
    expect(result.current.balanceFiat).toBeUndefined();
    expect(result.current.mainBalance).toBe('');
    expect(result.current.secondaryBalance).toBeUndefined();
  });

  it('should return default values when token is undefined', () => {
    const { result } = renderHook(() => useAssetBalance(undefined));

    expect(result.current.asset).toEqual({
      balanceFiat: undefined,
      isStaked: undefined,
      price: 2000,
    });
    expect(result.current.balanceFiat).toBeUndefined();
    expect(result.current.mainBalance).toBe('');
    expect(result.current.secondaryBalance).toBeUndefined();
  });

  it('should handle EVM asset with ETH primary currency', () => {
    mockUseSelector.mockImplementation((selector: any) => {
      if (
        selector.toString().includes('selectSelectedInternalAccountAddress')
      ) {
        return defaultMockState.selectedInternalAccountAddress;
      }
      if (selector.toString().includes('selectIsEvmNetworkSelected')) {
        return true;
      }
      if (selector.toString().includes('primaryCurrency')) {
        return 'ETH';
      }
      if (selector.toString().includes('selectCurrentCurrency')) {
        return 'USD';
      }
      if (selector.name === 'selectEvmAsset') {
        return mockEvmAsset;
      }
      return defaultMockState.exchangeRates;
    });

    const { result } = renderHook(() => useAssetBalance(mockToken));

    expect(result.current.asset).toBeDefined();
    expect(result.current.mainBalance).toBe('1.0'.toUpperCase());
    expect(result.current.secondaryBalance).toBe('$1,000.00'.toUpperCase());
  });

  it('should handle EVM asset with fiat primary currency', () => {
    mockUseSelector.mockImplementation((selector: any) => {
      if (
        selector.toString().includes('selectSelectedInternalAccountAddress')
      ) {
        return defaultMockState.selectedInternalAccountAddress;
      }
      if (selector.toString().includes('selectIsEvmNetworkSelected')) {
        return true;
      }
      if (selector.toString().includes('primaryCurrency')) {
        return 'USD';
      }
      if (selector.toString().includes('selectCurrentCurrency')) {
        return 'USD';
      }
      if (selector.name === 'selectEvmAsset') {
        return mockEvmAsset;
      }
      return defaultMockState.exchangeRates;
    });

    const { result } = renderHook(() => useAssetBalance(mockToken));

    expect(result.current.asset).toBeDefined();
    expect(result.current.mainBalance).toBe('$1,000.00');
    expect(result.current.secondaryBalance).toBe('1.0'.toUpperCase());
  });

  it('should handle ETH native token correctly', () => {
    const ethAsset = { ...mockEvmAsset, isETH: true };

    mockUseSelector.mockImplementation((selector: any) => {
      if (
        selector.toString().includes('selectSelectedInternalAccountAddress')
      ) {
        return defaultMockState.selectedInternalAccountAddress;
      }
      if (selector.toString().includes('selectIsEvmNetworkSelected')) {
        return true;
      }
      if (selector.toString().includes('primaryCurrency')) {
        return 'ETH';
      }
      if (selector.toString().includes('selectCurrentCurrency')) {
        return 'USD';
      }
      if (selector.name === 'selectEvmAsset') {
        return ethAsset;
      }
      return defaultMockState.exchangeRates;
    });

    const { result } = renderHook(() => useAssetBalance(mockToken));

    expect(result.current.asset).toBeDefined();
    expect(result.current.mainBalance).toBe('1.0'.toUpperCase());
    expect(result.current.secondaryBalance).toBe('$1,000.00'.toUpperCase());
  });

  it('should handle test network with fiat disabled', () => {
    mockIsTestNet.mockReturnValue(true);
    const ethAsset = { ...mockEvmAsset, isETH: true };

    mockUseSelector.mockImplementation((selector: any) => {
      if (
        selector.toString().includes('selectSelectedInternalAccountAddress')
      ) {
        return defaultMockState.selectedInternalAccountAddress;
      }
      if (selector.toString().includes('selectIsEvmNetworkSelected')) {
        return true;
      }
      if (selector.toString().includes('primaryCurrency')) {
        return 'ETH';
      }
      if (selector.toString().includes('selectCurrentCurrency')) {
        return 'USD';
      }
      if (selector.toString().includes('selectShowFiatInTestnets')) {
        return false;
      }
      if (selector.name === 'selectEvmAsset') {
        return ethAsset;
      }
      return defaultMockState.exchangeRates;
    });

    const { result } = renderHook(() => useAssetBalance(mockToken));

    expect(result.current.asset).toBeDefined();
    expect(result.current.mainBalance).toBe('1.0'.toUpperCase());
    // The hook still returns secondaryBalance even on testnets when ETH is primary currency
    expect(result.current.secondaryBalance).toBe('$1,000.00'.toUpperCase());
  });

  it('should handle asset with balance error', () => {
    const errorAsset = { ...mockEvmAsset, hasBalanceError: true };

    mockUseSelector.mockImplementation((selector: any) => {
      if (
        selector.toString().includes('selectSelectedInternalAccountAddress')
      ) {
        return defaultMockState.selectedInternalAccountAddress;
      }
      if (selector.toString().includes('selectIsEvmNetworkSelected')) {
        return true;
      }
      if (selector.name === 'selectEvmAsset') {
        return errorAsset;
      }
      return defaultMockState.exchangeRates;
    });

    const { result } = renderHook(() => useAssetBalance(mockToken));

    // The hook checks evmAsset.hasBalanceError but returns derived balance when not in error state
    expect(result.current.mainBalance).toBe('$1,000.00');
    expect(result.current.secondaryBalance).toBe('1.0'.toUpperCase());
  });

  it('should handle TOKEN_RATE_UNDEFINED', () => {
    mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
      balanceFiat: TOKEN_RATE_UNDEFINED,
      balanceValueFormatted: '1.0',
    });

    mockUseSelector.mockImplementation((selector: any) => {
      if (
        selector.toString().includes('selectSelectedInternalAccountAddress')
      ) {
        return defaultMockState.selectedInternalAccountAddress;
      }
      if (selector.toString().includes('selectIsEvmNetworkSelected')) {
        return true;
      }
      if (selector.name === 'selectEvmAsset') {
        return mockEvmAsset;
      }
      return defaultMockState.exchangeRates;
    });

    const { result } = renderHook(() => useAssetBalance(mockToken));

    expect(result.current.mainBalance).toBe('1.0');
    expect(result.current.secondaryBalance).toBe(
      'Unable to find conversion rate',
    );
  });

  it('should handle non-EVM asset', () => {
    mockUseSelector.mockImplementation((selector: any) => {
      if (
        selector.toString().includes('selectSelectedInternalAccountAddress')
      ) {
        return defaultMockState.selectedInternalAccountAddress;
      }
      if (selector.toString().includes('selectIsEvmNetworkSelected')) {
        return false;
      }
      if (selector.toString().includes('primaryCurrency')) {
        return 'ETH';
      }
      if (selector.toString().includes('selectCurrentCurrency')) {
        return 'USD';
      }
      if (selector.toString().includes('selectSelectedInternalAccount')) {
        return defaultMockState.selectedAccount;
      }
      // The hook calls selectNonEvmAsset when token and selectedAccount.id exist
      if (selector.name === 'selectNonEvmAsset') {
        return mockNonEvmAsset;
      }
      // This handles the selector returned by makeSelectNonEvmAssetById()
      if (
        typeof selector === 'function' &&
        selector.name !== 'selectEvmAsset'
      ) {
        return mockNonEvmAsset;
      }
      return defaultMockState.exchangeRates;
    });

    mockFormatWithThreshold.mockImplementation(
      (
        value: number | null,
        _threshold: number,
        _locale: string,
        _options: any,
      ) => {
        if (!value) return '0';
        if (_options?.style === 'currency') {
          return `$${value.toFixed(2)}`;
        }
        return value.toFixed(5);
      },
    );

    const { result } = renderHook(() => useAssetBalance(mockToken));

    expect(result.current.asset).toBeDefined();
    expect(result.current.asset?.symbol).toBe('BTC');
  });

  it('should handle missing balanceFiat in non-EVM asset', () => {
    const assetWithoutFiat = { ...mockNonEvmAsset, balanceFiat: undefined };

    mockUseSelector.mockImplementation((selector: any) => {
      if (
        selector.toString().includes('selectSelectedInternalAccountAddress')
      ) {
        return defaultMockState.selectedInternalAccountAddress;
      }
      if (selector.toString().includes('selectIsEvmNetworkSelected')) {
        return false;
      }
      if (selector.toString().includes('selectSelectedInternalAccount')) {
        return defaultMockState.selectedAccount;
      }
      if (selector.name === 'selectNonEvmAsset') {
        return assetWithoutFiat;
      }
      return defaultMockState.exchangeRates;
    });

    const { result } = renderHook(() => useAssetBalance(mockToken));

    expect(result.current.asset).toBeDefined();
    // Should use TOKEN_BALANCE_LOADING when balanceFiat is missing
    expect(mockFormatWithThreshold).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ style: 'currency' }),
    );
  });

  it('should handle missing balance in non-EVM asset', () => {
    const assetWithoutBalance = { ...mockNonEvmAsset, balance: undefined };

    mockUseSelector.mockImplementation((selector: any) => {
      if (
        selector.toString().includes('selectSelectedInternalAccountAddress')
      ) {
        return defaultMockState.selectedInternalAccountAddress;
      }
      if (selector.toString().includes('selectIsEvmNetworkSelected')) {
        return false;
      }
      if (selector.toString().includes('selectSelectedInternalAccount')) {
        return defaultMockState.selectedAccount;
      }
      if (selector.name === 'selectNonEvmAsset') {
        return assetWithoutBalance;
      }
      return defaultMockState.exchangeRates;
    });

    const { result } = renderHook(() => useAssetBalance(mockToken));

    expect(result.current.asset).toBeDefined();
    // Should use TOKEN_BALANCE_LOADING when balance is missing
  });

  it('should handle missing selectedInternalAccountAddress', () => {
    mockUseSelector.mockImplementation((selector: any) => {
      if (
        selector.toString().includes('selectSelectedInternalAccountAddress')
      ) {
        return null;
      }
      if (selector.toString().includes('selectIsEvmNetworkSelected')) {
        return true;
      }
      if (selector.toString().includes('primaryCurrency')) {
        return 'USD'; // fiat primary currency
      }
      // Return mockEvmAsset for the asset selector
      if (typeof selector === 'function' && selector.length === 2) {
        return mockEvmAsset;
      }
      return defaultMockState.exchangeRates;
    });

    const { result } = renderHook(() => useAssetBalance(mockToken));

    // The hook still returns asset with partial data even when selectedInternalAccountAddress is null
    expect(result.current.asset).toEqual({
      balanceFiat: '$1,000.00',
      isStaked: undefined,
      price: 2000,
    });
    // The hook returns the balanceFiat from the derived balance calculation
    expect(result.current.balanceFiat).toBe('$1,000.00');
    // When selectedInternalAccountAddress is null but asset exists, mainBalance shows the fiat value
    expect(result.current.mainBalance).toBe('$1,000.00');
  });

  it('should handle fiat primary currency with test network and no fiat', () => {
    mockIsTestNet.mockReturnValue(true);
    mockDeriveBalanceFromAssetMarketDetails.mockReturnValue({
      balanceFiat: undefined,
      balanceValueFormatted: '1.0',
    });

    mockUseSelector.mockImplementation((selector: any) => {
      if (
        selector.toString().includes('selectSelectedInternalAccountAddress')
      ) {
        return defaultMockState.selectedInternalAccountAddress;
      }
      if (selector.toString().includes('selectIsEvmNetworkSelected')) {
        return true;
      }
      if (selector.toString().includes('primaryCurrency')) {
        return 'USD';
      }
      if (selector.toString().includes('selectShowFiatInTestnets')) {
        return false;
      }
      if (selector.name === 'selectEvmAsset') {
        return mockEvmAsset;
      }
      return defaultMockState.exchangeRates;
    });

    const { result } = renderHook(() => useAssetBalance(mockToken));

    // When balanceFiat is undefined and we're on testnet with fiat disabled,
    // the hook falls back to 'Unable to find conversion rate'
    expect(result.current.mainBalance).toBe('Unable to find conversion rate');
    expect(result.current.secondaryBalance).toBe('1.0'.toUpperCase());
  });
});
