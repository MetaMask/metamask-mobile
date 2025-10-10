import { renderHook, waitFor } from '@testing-library/react-native';
import { useTokenExchangeRate } from './useTokenExchangeRate';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../../selectors/currencyRateController';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { selectNativeCurrencyByChainId } from '../../../../selectors/networkController';
import {
  exchangeRateFromMarketData,
  getTokenExchangeRate,
} from '../../Bridge/utils/exchange-rates';

// Mock the selectors
jest.mock('../../../../selectors/currencyRateController');
jest.mock('../../../../selectors/tokenRatesController');
jest.mock('../../../../selectors/networkController');
jest.mock('../../Bridge/utils/exchange-rates');

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: (selector: (state?: unknown) => unknown) => selector(),
}));

describe('useTokenExchangeRate', () => {
  const mockChainId = '0x1';
  const mockTokenAddress = '0xabc123';
  const mockCurrency = 'USD';
  const mockNativeCurrency = 'ETH';
  const mockNativeConversionRate = 3000; // ETH = $3000

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return exchange rate from allTokenMarketData when available', () => {
    // Given a token that exists in allTokenMarketData
    const mockMarketDataRate = 1.5;

    jest.mocked(selectCurrentCurrency).mockReturnValue(mockCurrency);
    jest.mocked(selectTokenMarketData).mockReturnValue({});
    jest.mocked(exchangeRateFromMarketData).mockReturnValue(mockMarketDataRate);

    const { result } = renderHook(() =>
      useTokenExchangeRate({
        chainId: mockChainId,
        tokenAddress: mockTokenAddress,
      }),
    );

    // Assert
    expect(result.current.exchangeRate).toBe(mockMarketDataRate);
    expect(result.current.isLoading).toBe(false);
  });

  it('should fetch exchange rate from API when not in allTokenMarketData', async () => {
    // Given a token not in allTokenMarketData
    const mockTokenFiatPrice = 100; // Token is $100
    const expectedTokenPriceInNativeAsset =
      mockTokenFiatPrice / mockNativeConversionRate; // 100/3000 = 0.0333 ETH

    jest.mocked(selectCurrentCurrency).mockReturnValue(mockCurrency);
    jest.mocked(selectCurrencyRates).mockReturnValue({
      [mockNativeCurrency]: {
        conversionRate: mockNativeConversionRate,
        conversionDate: Date.now(),
        usdConversionRate: mockNativeConversionRate,
      },
    });
    jest.mocked(selectTokenMarketData).mockReturnValue({});
    jest
      .mocked(selectNativeCurrencyByChainId)
      .mockReturnValue(mockNativeCurrency);
    jest.mocked(exchangeRateFromMarketData).mockReturnValue(undefined);
    jest.mocked(getTokenExchangeRate).mockResolvedValue(mockTokenFiatPrice);

    const { result } = renderHook(() =>
      useTokenExchangeRate({
        chainId: mockChainId,
        tokenAddress: mockTokenAddress,
      }),
    );

    // Initially should be loading
    expect(result.current.isLoading).toBe(true);

    // When fetch completes
    await waitFor(() => {
      expect(result.current.exchangeRate).toBeCloseTo(
        expectedTokenPriceInNativeAsset,
        4,
      );
      expect(result.current.isLoading).toBe(false);
    });

    // Verify API was called with correct params
    expect(getTokenExchangeRate).toHaveBeenCalledWith({
      chainId: mockChainId,
      tokenAddress: mockTokenAddress,
      currency: mockCurrency,
    });
  });

  it('should handle fetch errors gracefully', async () => {
    // Given an API that fails
    const apiError = new Error('API Error');

    jest.mocked(selectCurrentCurrency).mockReturnValue(mockCurrency);
    jest.mocked(selectCurrencyRates).mockReturnValue({
      [mockNativeCurrency]: {
        conversionRate: mockNativeConversionRate,
        conversionDate: Date.now(),
        usdConversionRate: mockNativeConversionRate,
      },
    });
    jest.mocked(selectTokenMarketData).mockReturnValue({});
    jest
      .mocked(selectNativeCurrencyByChainId)
      .mockReturnValue(mockNativeCurrency);
    jest.mocked(exchangeRateFromMarketData).mockReturnValue(undefined);
    jest.mocked(getTokenExchangeRate).mockRejectedValue(apiError);

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const { result } = renderHook(() =>
      useTokenExchangeRate({
        chainId: mockChainId,
        tokenAddress: mockTokenAddress,
      }),
    );

    // When error occurs
    await waitFor(() => {
      expect(result.current.exchangeRate).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });

    // Error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to fetch token exchange rate:',
      apiError,
    );

    consoleErrorSpy.mockRestore();
  });

  it('should not fetch when chainId or tokenAddress is missing', () => {
    // Given missing required parameters

    jest.mocked(selectCurrentCurrency).mockReturnValue(mockCurrency);
    jest.mocked(selectTokenMarketData).mockReturnValue({});
    jest.mocked(exchangeRateFromMarketData).mockReturnValue(undefined);

    const getTokenExchangeRateSpy = jest.mocked(getTokenExchangeRate);

    const { result } = renderHook(() =>
      useTokenExchangeRate({
        chainId: undefined,
        tokenAddress: undefined,
      }),
    );

    // Assert
    expect(result.current.exchangeRate).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(getTokenExchangeRateSpy).not.toHaveBeenCalled();
  });

  it('should use currencyOverride when provided', async () => {
    // Given a currency override is specified
    const mockOverrideCurrency = 'EUR';
    const mockTokenFiatPrice = 90;

    jest.mocked(selectCurrentCurrency).mockReturnValue(mockCurrency);
    jest.mocked(selectCurrencyRates).mockReturnValue({
      [mockNativeCurrency]: {
        conversionRate: mockNativeConversionRate,
        conversionDate: Date.now(),
        usdConversionRate: mockNativeConversionRate,
      },
    });
    jest.mocked(selectTokenMarketData).mockReturnValue({});
    jest
      .mocked(selectNativeCurrencyByChainId)
      .mockReturnValue(mockNativeCurrency);
    jest.mocked(exchangeRateFromMarketData).mockReturnValue(undefined);
    jest.mocked(getTokenExchangeRate).mockResolvedValue(mockTokenFiatPrice);

    renderHook(() =>
      useTokenExchangeRate({
        chainId: mockChainId,
        tokenAddress: mockTokenAddress,
        currencyOverride: mockOverrideCurrency,
      }),
    );

    // API was called with override currency
    await waitFor(() => {
      expect(getTokenExchangeRate).toHaveBeenCalledWith({
        chainId: mockChainId,
        tokenAddress: mockTokenAddress,
        currency: mockOverrideCurrency,
      });
    });
  });

  it('should fetch exchange rate for non-EVM chains (Solana) without conversion', async () => {
    // Given a Solana token (non-EVM chain)
    const mockSolanaChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    const mockSolanaTokenAddress =
      'So11111111111111111111111111111111111111112';
    const mockTokenFiatPrice = 150; // Token is $150 in fiat

    jest.mocked(selectCurrentCurrency).mockReturnValue(mockCurrency);
    jest.mocked(selectCurrencyRates).mockReturnValue({
      // No SOL in currencyRates (non-EVM chains don't have native currency here)
      [mockNativeCurrency]: {
        conversionRate: mockNativeConversionRate,
        conversionDate: Date.now(),
        usdConversionRate: mockNativeConversionRate,
      },
    });
    jest.mocked(selectTokenMarketData).mockReturnValue({});
    jest
      .mocked(selectNativeCurrencyByChainId)
      .mockReturnValue(undefined as unknown as string); // Returns undefined for Solana (non-EVM)
    jest.mocked(exchangeRateFromMarketData).mockReturnValue(undefined);
    jest.mocked(getTokenExchangeRate).mockResolvedValue(mockTokenFiatPrice);

    const { result } = renderHook(() =>
      useTokenExchangeRate({
        chainId: mockSolanaChainId,
        tokenAddress: mockSolanaTokenAddress,
      }),
    );

    // Initially should be loading
    expect(result.current.isLoading).toBe(true);

    // When fetch completes, returns fiat price directly (no conversion for non-EVM)
    await waitFor(() => {
      expect(result.current.exchangeRate).toBe(mockTokenFiatPrice); // Returns $150 directly, not converted
      expect(result.current.isLoading).toBe(false);
    });

    // API was called
    expect(getTokenExchangeRate).toHaveBeenCalledWith({
      chainId: mockSolanaChainId,
      tokenAddress: mockSolanaTokenAddress,
      currency: mockCurrency,
    });
  });
});
