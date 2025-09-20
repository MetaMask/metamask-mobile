import { renderHook } from '@testing-library/react-native';
import { useCryptoCurrencies } from './useCryptoCurrencies';
import {
  MOCK_CRYPTOCURRENCIES,
  MOCK_USDC_TOKEN,
  MOCK_ETH_TOKEN,
  MOCK_US_REGION,
  createMockSDKReturn,
} from '../testUtils/constants';

const mockUseDepositSdkMethod = jest.fn();
jest.mock('./useDepositSdkMethod', () => ({
  useDepositSdkMethod: (method: string, regionCode?: string) =>
    mockUseDepositSdkMethod(method, regionCode),
}));

const mockUseDepositSDK = jest.fn();
jest.mock('../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
}));

describe('useCryptoCurrencies', () => {
  const mockSetSelectedCryptoCurrency = jest.fn();
  const mockRetryFetchCryptoCurrencies = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default SDK state
    mockUseDepositSDK.mockReturnValue(
      createMockSDKReturn({
        selectedRegion: MOCK_US_REGION,
        selectedCryptoCurrency: null,
        setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
      }),
    );

    // Default useDepositSdkMethod state
    mockUseDepositSdkMethod.mockReturnValue([
      { data: MOCK_CRYPTOCURRENCIES, error: null, isFetching: false },
      mockRetryFetchCryptoCurrencies,
    ]);
  });

  describe('basic functionality', () => {
    it('returns cryptocurrencies from API', () => {
      // Act
      const { result } = renderHook(() => useCryptoCurrencies());

      // Assert
      expect(result.current.cryptoCurrencies).toEqual(MOCK_CRYPTOCURRENCIES);
      expect(result.current.error).toBeNull();
      expect(result.current.isFetching).toBe(false);
      expect(result.current.retryFetchCryptoCurrencies).toBe(
        mockRetryFetchCryptoCurrencies,
      );
    });

    it('calls useDepositSdkMethod with correct parameters', () => {
      // Act
      renderHook(() => useCryptoCurrencies());

      // Assert
      expect(mockUseDepositSdkMethod).toHaveBeenCalledWith(
        'getCryptoCurrencies',
        MOCK_US_REGION.isoCode,
      );
    });

    it('calls useDepositSdkMethod with undefined when no region selected', () => {
      // Arrange
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: null,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
        }),
      );

      // Act
      renderHook(() => useCryptoCurrencies());

      // Assert
      expect(mockUseDepositSdkMethod).toHaveBeenCalledWith(
        'getCryptoCurrencies',
        undefined,
      );
    });
  });

  describe('loading states', () => {
    it('returns loading state when fetching', () => {
      // Arrange
      mockUseDepositSdkMethod.mockReturnValue([
        { data: null, error: null, isFetching: true },
        mockRetryFetchCryptoCurrencies,
      ]);

      // Act
      const { result } = renderHook(() => useCryptoCurrencies());

      // Assert
      expect(result.current.cryptoCurrencies).toBeNull();
      expect(result.current.isFetching).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('returns error state when API fails', () => {
      // Arrange
      const mockError = 'Failed to fetch cryptocurrencies';
      mockUseDepositSdkMethod.mockReturnValue([
        { data: null, error: mockError, isFetching: false },
        mockRetryFetchCryptoCurrencies,
      ]);

      // Act
      const { result } = renderHook(() => useCryptoCurrencies());

      // Assert
      expect(result.current.cryptoCurrencies).toBeNull();
      expect(result.current.error).toBe(mockError);
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('cryptocurrency selection logic', () => {
    it('selects first cryptocurrency when none is currently selected', () => {
      // Arrange
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: null,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
        }),
      );

      // Act
      renderHook(() => useCryptoCurrencies());

      // Assert
      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_CRYPTOCURRENCIES[0],
      );
    });

    it('maintains existing selection when cryptocurrency is still available', () => {
      // Arrange
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: MOCK_USDC_TOKEN,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
        }),
      );

      // Act
      renderHook(() => useCryptoCurrencies());

      // Assert
      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_USDC_TOKEN,
      );
    });

    it('resets to first cryptocurrency when current selection is no longer available', () => {
      // Arrange
      const unavailableCrypto = {
        assetId: 'unavailable-token',
        chainId: 'eip155:1',
        name: 'Unavailable Token',
        symbol: 'UNAVAIL',
        decimals: 18,
        iconUrl: 'https://example.com/icon.png',
      };

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: unavailableCrypto,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
        }),
      );

      // Act
      renderHook(() => useCryptoCurrencies());

      // Assert
      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_CRYPTOCURRENCIES[0],
      );
    });

    it('finds and maintains existing cryptocurrency by assetId', () => {
      // Arrange
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: MOCK_ETH_TOKEN,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
        }),
      );

      // Act
      renderHook(() => useCryptoCurrencies());

      // Assert
      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_ETH_TOKEN,
      );
    });
  });

  describe('edge cases', () => {
    it('does not update selection when cryptocurrencies array is empty', () => {
      // Arrange
      mockUseDepositSdkMethod.mockReturnValue([
        { data: [], error: null, isFetching: false },
        mockRetryFetchCryptoCurrencies,
      ]);

      // Act
      renderHook(() => useCryptoCurrencies());

      // Assert
      expect(mockSetSelectedCryptoCurrency).not.toHaveBeenCalled();
    });

    it('does not update selection when cryptocurrencies is null', () => {
      // Arrange
      mockUseDepositSdkMethod.mockReturnValue([
        { data: null, error: null, isFetching: false },
        mockRetryFetchCryptoCurrencies,
      ]);

      // Act
      renderHook(() => useCryptoCurrencies());

      // Assert
      expect(mockSetSelectedCryptoCurrency).not.toHaveBeenCalled();
    });

    it('handles multiple hook renders correctly', () => {
      // Arrange
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: null,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
        }),
      );

      // Act
      const { rerender } = renderHook(() => useCryptoCurrencies());
      rerender();
      rerender();

      // Assert - should only be called once due to useEffect dependencies
      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledTimes(1);
    });
  });

  describe('dependency changes', () => {
    it('updates selection when cryptocurrencies data changes', () => {
      // Arrange
      const { rerender } = renderHook(() => useCryptoCurrencies());

      // Clear initial call
      mockSetSelectedCryptoCurrency.mockClear();

      // Change the data
      const newCryptocurrencies = [MOCK_ETH_TOKEN];
      mockUseDepositSdkMethod.mockReturnValue([
        { data: newCryptocurrencies, error: null, isFetching: false },
        mockRetryFetchCryptoCurrencies,
      ]);

      // Act
      rerender();

      // Assert
      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_ETH_TOKEN,
      );
    });

    it('updates selection when selectedCryptoCurrency changes', () => {
      // Arrange
      const { rerender } = renderHook(() => useCryptoCurrencies());

      // Clear initial call
      mockSetSelectedCryptoCurrency.mockClear();

      // Change the selected cryptocurrency
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: MOCK_ETH_TOKEN,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
        }),
      );

      // Act
      rerender();

      // Assert
      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_ETH_TOKEN,
      );
    });
  });
});
