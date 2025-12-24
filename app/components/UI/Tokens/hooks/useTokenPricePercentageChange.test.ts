import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useTokenPricePercentageChange } from './useTokenPricePercentageChange';
import { TokenI } from '../types';
import { getNativeTokenAddress } from '@metamask/assets-controllers';

// Mock all the dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@metamask/assets-controllers', () => ({
  getNativeTokenAddress: jest.fn(),
}));

// Mock the selectors
jest.mock('../../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(),
}));

jest.mock('../../../../selectors/multichain/multichain', () => ({
  selectMultichainAssetsRates: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockGetNativeTokenAddress = getNativeTokenAddress as jest.MockedFunction<
  typeof getNativeTokenAddress
>;

describe('useTokenPricePercentageChange', () => {
  const mockToken: TokenI = {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    aggregators: [],
    decimals: 18,
    image: '',
    name: 'Test Token',
    symbol: 'TEST',
    balance: '1000000000000000000',
    logo: '',
    isETH: false,
    chainId: '0x1',
    isNative: false,
  };

  const mockNativeToken: TokenI = {
    ...mockToken,
    address: '0x0000000000000000000000000000000000000000',
    isNative: true,
    symbol: 'ETH',
    name: 'Ethereum',
  };

  const mockMultiChainMarketData = {
    '0x1': {
      '0x1234567890abcdef1234567890abcdef12345678': {
        pricePercentChange1d: 5.67,
      },
      '0x0000000000000000000000000000000000000000': {
        pricePercentChange1d: 3.45,
      },
    },
  };

  const mockAllMultichainAssetsRates = {
    '0x1234567890abcdef1234567890abcdef12345678': {
      marketData: {
        pricePercentChange: {
          P1D: 7.89,
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNativeTokenAddress.mockReturnValue(
      '0x0000000000000000000000000000000000000000',
    );
  });

  describe('Basic token percentage change retrieval', () => {
    it('returns percentage change for regular token from EVM data', () => {
      mockUseSelector
        .mockReturnValueOnce(mockMultiChainMarketData) // selectTokenMarketData
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockToken),
      );

      expect(result.current).toBe(5.67);
    });

    it('returns percentage change for native token from EVM data', () => {
      mockUseSelector
        .mockReturnValueOnce(mockMultiChainMarketData) // selectTokenMarketData
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockNativeToken),
      );

      expect(mockGetNativeTokenAddress).toHaveBeenCalledWith('0x1');
      expect(result.current).toBe(3.45);
    });

    it('returns undefined when token has no address', () => {
      const tokenWithoutAddress = { ...mockToken, address: '' };

      mockUseSelector
        .mockReturnValueOnce(mockMultiChainMarketData) // selectTokenMarketData
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(tokenWithoutAddress),
      );

      expect(result.current).toBeUndefined();
    });

    it('returns undefined when no asset is provided', () => {
      mockUseSelector
        .mockReturnValueOnce(mockMultiChainMarketData) // selectTokenMarketData
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(undefined),
      );

      expect(result.current).toBeUndefined();
    });
  });

  describe('Multichain assets rates scenarios (keyring-snaps)', () => {
    it('prioritizes multichain rates when available', () => {
      mockUseSelector
        .mockReturnValueOnce(mockMultiChainMarketData) // selectTokenMarketData (has 5.67)
        .mockReturnValueOnce(mockAllMultichainAssetsRates); // selectMultichainAssetsRates (has 7.89)

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockToken),
      );

      // Returns multichain data (7.89) not EVM data (5.67)
      expect(result.current).toBe(7.89);
    });

    it('falls back to EVM price when multichain data is unavailable', () => {
      const emptyMultichainRates = {};

      mockUseSelector
        .mockReturnValueOnce(mockMultiChainMarketData) // selectTokenMarketData
        .mockReturnValueOnce(emptyMultichainRates); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockToken),
      );

      expect(result.current).toBe(5.67);
    });

    it('falls back to EVM price when multichain data is null', () => {
      mockUseSelector
        .mockReturnValueOnce(mockMultiChainMarketData) // selectTokenMarketData
        .mockReturnValueOnce(null); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockToken),
      );

      expect(result.current).toBe(5.67);
    });

    it('falls back to EVM price when multichain data is undefined', () => {
      mockUseSelector
        .mockReturnValueOnce(mockMultiChainMarketData) // selectTokenMarketData
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockToken),
      );

      expect(result.current).toBe(5.67);
    });

    it('uses EVM fallback when multichain data exists but P1D is missing', () => {
      const multichainWithoutP1D = {
        '0x1234567890abcdef1234567890abcdef12345678': {
          marketData: {
            pricePercentChange: {
              // P1D missing
            },
          },
        },
      };

      mockUseSelector
        .mockReturnValueOnce(mockMultiChainMarketData) // selectTokenMarketData
        .mockReturnValueOnce(multichainWithoutP1D); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockToken),
      );

      expect(result.current).toBe(5.67);
    });

    it('uses EVM fallback when multichain marketData is missing', () => {
      const multichainWithoutMarketData = {
        '0x1234567890abcdef1234567890abcdef12345678': {
          // marketData missing
        },
      };

      mockUseSelector
        .mockReturnValueOnce(mockMultiChainMarketData) // selectTokenMarketData
        .mockReturnValueOnce(multichainWithoutMarketData); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockToken),
      );

      expect(result.current).toBe(5.67);
    });

    it('returns undefined when both multichain and EVM data are unavailable', () => {
      mockUseSelector
        .mockReturnValueOnce({}) // selectTokenMarketData - empty
        .mockReturnValueOnce({}); // selectMultichainAssetsRates - empty

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockToken),
      );

      expect(result.current).toBeUndefined();
    });

    it('returns undefined when multichain asset data missing for specific token', () => {
      const partialMultichainRates = {
        'other-asset-address': {
          marketData: {
            pricePercentChange: {
              P1D: 7.89,
            },
          },
        },
      };

      mockUseSelector
        .mockReturnValueOnce({}) // selectTokenMarketData - empty
        .mockReturnValueOnce(partialMultichainRates); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockToken),
      );

      expect(result.current).toBeUndefined();
    });
  });

  describe('EVM market data scenarios', () => {
    it('returns EVM percentage change when multichain data not available', () => {
      mockUseSelector
        .mockReturnValueOnce(mockMultiChainMarketData) // selectTokenMarketData
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockToken),
      );

      expect(result.current).toBe(5.67);
    });

    it('returns undefined when no market data available', () => {
      mockUseSelector
        .mockReturnValueOnce({}) // selectTokenMarketData - empty
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockToken),
      );

      expect(result.current).toBeUndefined();
    });

    it('returns undefined when chain data missing', () => {
      const partialMarketData = {
        '0x5': {
          '0x1234567890abcdef1234567890abcdef12345678': {
            pricePercentChange1d: 5.67,
          },
        },
      };

      mockUseSelector
        .mockReturnValueOnce(partialMarketData) // selectTokenMarketData
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockToken),
      );

      expect(result.current).toBeUndefined();
    });

    it('returns undefined when token data missing for chain', () => {
      const partialMarketData = {
        '0x1': {
          '0xother': {
            pricePercentChange1d: 5.67,
          },
        },
      };

      mockUseSelector
        .mockReturnValueOnce(partialMarketData) // selectTokenMarketData
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockToken),
      );

      expect(result.current).toBeUndefined();
    });
  });

  describe('Edge cases and data validation', () => {
    it('handles null multichain market data', () => {
      mockUseSelector
        .mockReturnValueOnce(null) // selectTokenMarketData
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockToken),
      );

      expect(result.current).toBeUndefined();
    });

    it('handles undefined multichain market data', () => {
      mockUseSelector
        .mockReturnValueOnce(undefined) // selectTokenMarketData
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockToken),
      );

      expect(result.current).toBeUndefined();
    });

    it('handles token without chainId', () => {
      const tokenWithoutChainId = { ...mockToken, chainId: undefined };

      mockUseSelector
        .mockReturnValueOnce(mockMultiChainMarketData) // selectTokenMarketData
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(tokenWithoutChainId),
      );

      expect(result.current).toBeUndefined();
    });

    it('handles native token without chainId', () => {
      const nativeTokenWithoutChainId = {
        ...mockNativeToken,
        chainId: undefined,
      };

      mockUseSelector
        .mockReturnValueOnce(mockMultiChainMarketData) // selectTokenMarketData
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(nativeTokenWithoutChainId),
      );

      expect(result.current).toBeUndefined();
    });

    it('handles zero percentage change values', () => {
      const marketDataWithZero = {
        '0x1': {
          '0x1234567890abcdef1234567890abcdef12345678': {
            pricePercentChange1d: 0,
          },
        },
      };

      mockUseSelector
        .mockReturnValueOnce(marketDataWithZero) // selectTokenMarketData
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockToken),
      );

      expect(result.current).toBe(0);
    });

    it('handles negative percentage change values', () => {
      const marketDataWithNegative = {
        '0x1': {
          '0x1234567890abcdef1234567890abcdef12345678': {
            pricePercentChange1d: -15.43,
          },
        },
      };

      mockUseSelector
        .mockReturnValueOnce(marketDataWithNegative) // selectTokenMarketData
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockToken),
      );

      expect(result.current).toBe(-15.43);
    });
  });

  describe('Native token address resolution', () => {
    it('calls getNativeTokenAddress with correct chainId for native tokens', () => {
      const customChainNativeToken = {
        ...mockNativeToken,
        chainId: '0x89', // Polygon
      };

      const customChainMarketData = {
        '0x89': {
          '0x0000000000000000000000000000000000000000': {
            pricePercentChange1d: 8.91,
          },
        },
      };

      mockUseSelector
        .mockReturnValueOnce(customChainMarketData) // selectTokenMarketData
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(customChainNativeToken),
      );

      expect(mockGetNativeTokenAddress).toHaveBeenCalledWith('0x89');
      expect(result.current).toBe(8.91);
    });

    it('handles getNativeTokenAddress returning different address', () => {
      const customNativeAddress = '0xCustomNativeAddress';
      mockGetNativeTokenAddress.mockReturnValue(customNativeAddress);

      const marketDataWithCustomNative = {
        '0x1': {
          [customNativeAddress]: {
            pricePercentChange1d: 12.34,
          },
        },
      };

      mockUseSelector
        .mockReturnValueOnce(marketDataWithCustomNative) // selectTokenMarketData
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockNativeToken),
      );

      expect(result.current).toBe(12.34);
    });

    it('does not call getNativeTokenAddress for non-native tokens', () => {
      mockUseSelector
        .mockReturnValueOnce(mockMultiChainMarketData) // selectTokenMarketData
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      renderHook(() => useTokenPricePercentageChange(mockToken));

      expect(mockGetNativeTokenAddress).not.toHaveBeenCalled();
    });
  });

  describe('Selector call verification', () => {
    it('calls both selectors', () => {
      mockUseSelector
        .mockReturnValueOnce(mockMultiChainMarketData) // selectTokenMarketData
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      renderHook(() => useTokenPricePercentageChange(mockToken));

      expect(mockUseSelector).toHaveBeenCalledTimes(2);
    });

    it('handles all selectors returning null', () => {
      mockUseSelector
        .mockReturnValueOnce(null) // selectTokenMarketData
        .mockReturnValueOnce(null); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockToken),
      );

      expect(result.current).toBeUndefined();
    });

    it('handles all selectors returning undefined', () => {
      mockUseSelector
        .mockReturnValueOnce(undefined) // selectTokenMarketData
        .mockReturnValueOnce(undefined); // selectMultichainAssetsRates

      const { result } = renderHook(() =>
        useTokenPricePercentageChange(mockToken),
      );

      expect(result.current).toBeUndefined();
    });
  });
});
