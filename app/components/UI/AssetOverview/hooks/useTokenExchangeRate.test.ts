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

    // Arrange
    jest.mocked(selectCurrentCurrency).mockReturnValue(mockCurrency);
    jest.mocked(selectTokenMarketData).mockReturnValue({});
    jest.mocked(exchangeRateFromMarketData).mockReturnValue(mockMarketDataRate);

    // Act
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

    // Arrange
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

    // Act
    const { result } = renderHook(() =>
      useTokenExchangeRate({
        chainId: mockChainId,
        tokenAddress: mockTokenAddress,
      }),
    );

    // Assert - Initially should be loading
    expect(result.current.isLoading).toBe(true);

    // Assert - When fetch completes
    await waitFor(() => {
      expect(result.current.exchangeRate).toBeCloseTo(
        expectedTokenPriceInNativeAsset,
        4,
      );
      expect(result.current.isLoading).toBe(false);
    });

    // Assert - Verify API was called with correct params
    expect(getTokenExchangeRate).toHaveBeenCalledWith({
      chainId: mockChainId,
      tokenAddress: mockTokenAddress,
      currency: mockCurrency,
    });
  });

  it('should handle fetch errors gracefully', async () => {
    // Given an API that fails
    const apiError = new Error('API Error');

    // Arrange
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

    // Act
    const { result } = renderHook(() =>
      useTokenExchangeRate({
        chainId: mockChainId,
        tokenAddress: mockTokenAddress,
      }),
    );

    // Assert - When error occurs
    await waitFor(() => {
      expect(result.current.exchangeRate).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });

    // Assert - Error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to fetch token exchange rate:',
      apiError,
    );

    consoleErrorSpy.mockRestore();
  });

  it('should not fetch when chainId or tokenAddress is missing', () => {
    // Given missing required parameters
    // Arrange
    jest.mocked(selectCurrentCurrency).mockReturnValue(mockCurrency);
    jest.mocked(selectTokenMarketData).mockReturnValue({});
    jest.mocked(exchangeRateFromMarketData).mockReturnValue(undefined);

    const getTokenExchangeRateSpy = jest.mocked(getTokenExchangeRate);

    // Act
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

    // Arrange
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

    // Act
    renderHook(() =>
      useTokenExchangeRate({
        chainId: mockChainId,
        tokenAddress: mockTokenAddress,
        currencyOverride: mockOverrideCurrency,
      }),
    );

    // Assert - API was called with override currency
    await waitFor(() => {
      expect(getTokenExchangeRate).toHaveBeenCalledWith({
        chainId: mockChainId,
        tokenAddress: mockTokenAddress,
        currency: mockOverrideCurrency,
      });
    });
  });
});
