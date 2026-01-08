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

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

describe('useCryptoCurrencies', () => {
  const mockSetSelectedCryptoCurrency = jest.fn();
  const mockSetIntent = jest.fn();
  const mockRetryFetchCryptoCurrencies = jest.fn();

  const mockNetworkConfigurations = {
    'eip155:1': {
      name: 'Ethereum Mainnet',
      chainId: '0x1',
    },
    'bip122:000000000019d6689c085ae165831e93': {
      name: 'Bitcoin',
      chainId: 'bip122:000000000019d6689c085ae165831e93',
    },
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
      name: 'Solana',
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockReturnValue(mockNetworkConfigurations);

    mockUseDepositSDK.mockReturnValue(
      createMockSDKReturn({
        selectedRegion: MOCK_US_REGION,
        selectedCryptoCurrency: null,
        setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
        intent: undefined,
        setIntent: mockSetIntent,
      }),
    );

    mockUseDepositSdkMethod.mockReturnValue([
      { data: MOCK_CRYPTOCURRENCIES, error: null, isFetching: false },
      mockRetryFetchCryptoCurrencies,
    ]);
  });

  describe('basic functionality', () => {
    it('returns cryptocurrencies from API', () => {
      const { result } = renderHook(() => useCryptoCurrencies());

      expect(result.current.cryptoCurrencies).toEqual(MOCK_CRYPTOCURRENCIES);
      expect(result.current.error).toBeNull();
      expect(result.current.isFetching).toBe(false);
      expect(result.current.retryFetchCryptoCurrencies).toBe(
        mockRetryFetchCryptoCurrencies,
      );
    });

    it('calls useDepositSdkMethod with correct parameters', () => {
      renderHook(() => useCryptoCurrencies());

      expect(mockUseDepositSdkMethod).toHaveBeenCalledWith(
        'getCryptoCurrencies',
        MOCK_US_REGION.isoCode,
      );
    });

    it('calls useDepositSdkMethod with undefined when no region selected', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: null,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
        }),
      );

      renderHook(() => useCryptoCurrencies());

      expect(mockUseDepositSdkMethod).toHaveBeenCalledWith(
        'getCryptoCurrencies',
        undefined,
      );
    });
  });

  describe('loading states', () => {
    it('returns loading state when fetching', () => {
      mockUseDepositSdkMethod.mockReturnValue([
        { data: null, error: null, isFetching: true },
        mockRetryFetchCryptoCurrencies,
      ]);

      const { result } = renderHook(() => useCryptoCurrencies());

      expect(result.current.cryptoCurrencies).toBeNull();
      expect(result.current.isFetching).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('returns error state when API fails', () => {
      const mockError = 'Failed to fetch cryptocurrencies';
      mockUseDepositSdkMethod.mockReturnValue([
        { data: null, error: mockError, isFetching: false },
        mockRetryFetchCryptoCurrencies,
      ]);

      const { result } = renderHook(() => useCryptoCurrencies());

      expect(result.current.cryptoCurrencies).toBeNull();
      expect(result.current.error).toBe(mockError);
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('cryptocurrency selection logic', () => {
    it('selects first cryptocurrency when none is currently selected', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: null,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
        }),
      );

      renderHook(() => useCryptoCurrencies());

      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_CRYPTOCURRENCIES[0],
      );
    });

    it('maintains existing selection when cryptocurrency is still available', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: MOCK_USDC_TOKEN,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
        }),
      );

      renderHook(() => useCryptoCurrencies());

      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_USDC_TOKEN,
      );
    });

    it('resets to first cryptocurrency when current selection is no longer available', () => {
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

      renderHook(() => useCryptoCurrencies());

      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_CRYPTOCURRENCIES[0],
      );
    });

    it('finds and maintains existing cryptocurrency by assetId', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: MOCK_ETH_TOKEN,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
        }),
      );

      renderHook(() => useCryptoCurrencies());

      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_ETH_TOKEN,
      );
    });
  });

  describe('edge cases', () => {
    it('does not update selection when cryptocurrencies array is empty', () => {
      mockUseDepositSdkMethod.mockReturnValue([
        { data: [], error: null, isFetching: false },
        mockRetryFetchCryptoCurrencies,
      ]);
      renderHook(() => useCryptoCurrencies());
      expect(mockSetSelectedCryptoCurrency).not.toHaveBeenCalled();
    });

    it('does not update selection when cryptocurrencies is null', () => {
      mockUseDepositSdkMethod.mockReturnValue([
        { data: null, error: null, isFetching: false },
        mockRetryFetchCryptoCurrencies,
      ]);

      renderHook(() => useCryptoCurrencies());

      expect(mockSetSelectedCryptoCurrency).not.toHaveBeenCalled();
    });

    it('handles multiple hook renders correctly', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: null,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
        }),
      );

      const { rerender } = renderHook(() => useCryptoCurrencies());
      rerender({});
      rerender({});

      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledTimes(1);
    });
  });

  describe('dependency changes', () => {
    it('updates selection when cryptocurrencies data changes', () => {
      const { rerender } = renderHook(() => useCryptoCurrencies());

      mockSetSelectedCryptoCurrency.mockClear();

      const newCryptocurrencies = [MOCK_ETH_TOKEN];
      mockUseDepositSdkMethod.mockReturnValue([
        { data: newCryptocurrencies, error: null, isFetching: false },
        mockRetryFetchCryptoCurrencies,
      ]);

      rerender({});

      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_ETH_TOKEN,
      );
    });

    it('updates selection when selectedCryptoCurrency changes', () => {
      const { rerender } = renderHook(() => useCryptoCurrencies());

      mockSetSelectedCryptoCurrency.mockClear();

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: MOCK_ETH_TOKEN,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
          setIntent: mockSetIntent,
        }),
      );

      rerender({});

      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_ETH_TOKEN,
      );
    });
  });

  describe('intent-based token selection', () => {
    it('selects cryptocurrency matching intent assetId directly', () => {
      const intent = { assetId: MOCK_USDC_TOKEN.assetId };
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: null,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
          intent,
          setIntent: mockSetIntent,
        }),
      );

      renderHook(() => useCryptoCurrencies());

      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_USDC_TOKEN,
      );
    });

    it('selects cryptocurrency matching intent assetId with chainId format', () => {
      const intent = {
        assetId: `${MOCK_USDC_TOKEN.chainId}/${MOCK_USDC_TOKEN.assetId}`,
      };
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: null,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
          intent,
          setIntent: mockSetIntent,
        }),
      );

      renderHook(() => useCryptoCurrencies());

      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_USDC_TOKEN,
      );
    });

    it('clears intent assetId after processing', () => {
      const intent = { assetId: MOCK_ETH_TOKEN.assetId };
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: null,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
          intent,
          setIntent: mockSetIntent,
        }),
      );

      renderHook(() => useCryptoCurrencies());

      expect(mockSetIntent).toHaveBeenCalledWith(expect.any(Function));
    });

    it('selects first cryptocurrency when intent assetId does not match any token', () => {
      const intent = { assetId: 'unknown-asset-id' };
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: null,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
          intent,
          setIntent: mockSetIntent,
        }),
      );

      renderHook(() => useCryptoCurrencies());

      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_CRYPTOCURRENCIES[0],
      );
    });

    it('prioritizes intent-based selection over existing selection', () => {
      const intent = { assetId: MOCK_ETH_TOKEN.assetId };
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: MOCK_USDC_TOKEN,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
          intent,
          setIntent: mockSetIntent,
        }),
      );

      renderHook(() => useCryptoCurrencies());

      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_ETH_TOKEN,
      );
    });

    it('does not process intent when assetId is undefined', () => {
      const intent = { amount: '100' };
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: null,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
          intent,
          setIntent: mockSetIntent,
        }),
      );

      renderHook(() => useCryptoCurrencies());

      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_CRYPTOCURRENCIES[0],
      );
    });

    it('does not select when intent assetId matches token without assetId property', () => {
      const cryptoWithoutAssetId = {
        ...MOCK_ETH_TOKEN,
        assetId: undefined,
      };
      const cryptosWithMissing = [cryptoWithoutAssetId, MOCK_USDC_TOKEN];
      mockUseDepositSdkMethod.mockReturnValue([
        { data: cryptosWithMissing, error: null, isFetching: false },
        mockRetryFetchCryptoCurrencies,
      ]);

      const intent = { assetId: 'eth' };
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: null,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
          intent,
          setIntent: mockSetIntent,
        }),
      );

      renderHook(() => useCryptoCurrencies());

      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        cryptosWithMissing[0],
      );
    });

    it('selects native token when intent has slip44 wildcard assetId', () => {
      const intent = { assetId: 'eip155:1/slip44:.' };
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: null,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
          intent,
          setIntent: mockSetIntent,
        }),
      );

      renderHook(() => useCryptoCurrencies());

      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_ETH_TOKEN,
      );
    });

    it('selects native token when intent has slip44 wildcard with different chainId', () => {
      const mockPolygonNativeToken = {
        assetId: 'eip155:137/slip44:966',
        chainId: 'eip155:137',
        name: 'Polygon',
        symbol: 'POL',
        decimals: 18,
        iconUrl: 'https://example.com/pol.png',
      };
      const cryptosWithPolygon = [
        ...MOCK_CRYPTOCURRENCIES,
        mockPolygonNativeToken,
      ];
      mockUseDepositSdkMethod.mockReturnValue([
        { data: cryptosWithPolygon, error: null, isFetching: false },
        mockRetryFetchCryptoCurrencies,
      ]);
      mockUseSelector.mockReturnValue({
        ...mockNetworkConfigurations,
        'eip155:137': { name: 'Polygon', chainId: '0x89' },
      });

      const intent = { assetId: 'eip155:137/slip44:.' };
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: null,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
          intent,
          setIntent: mockSetIntent,
        }),
      );

      renderHook(() => useCryptoCurrencies());

      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        mockPolygonNativeToken,
      );
    });

    it('falls back to first token when slip44 wildcard does not match any native token', () => {
      const intent = { assetId: 'eip155:999/slip44:.' };
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: null,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
          intent,
          setIntent: mockSetIntent,
        }),
      );

      renderHook(() => useCryptoCurrencies());

      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_CRYPTOCURRENCIES[0],
      );
    });

    it('prefers direct match over slip44 wildcard matching', () => {
      const intent = { assetId: MOCK_USDC_TOKEN.assetId };
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_US_REGION,
          selectedCryptoCurrency: null,
          setSelectedCryptoCurrency: mockSetSelectedCryptoCurrency,
          intent,
          setIntent: mockSetIntent,
        }),
      );

      renderHook(() => useCryptoCurrencies());

      expect(mockSetSelectedCryptoCurrency).toHaveBeenCalledWith(
        MOCK_USDC_TOKEN,
      );
    });
  });
});
