import { renderHook } from '@testing-library/react-hooks';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { useMusdConversionTokens } from './useMusdConversionTokens';
import { selectMusdConversionPaymentTokensAllowlist } from '../selectors/featureFlags';
import { isMusdConversionPaymentToken } from '../utils/musd';
import { AssetType } from '../../../Views/confirmations/types/token';
import { useAccountTokens } from '../../../Views/confirmations/hooks/send/useAccountTokens';

jest.mock('react-redux');
jest.mock('../selectors/featureFlags');
jest.mock('../utils/musd');
jest.mock('../../../Views/confirmations/hooks/send/useAccountTokens');

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockIsMusdConversionPaymentToken =
  isMusdConversionPaymentToken as jest.MockedFunction<
    typeof isMusdConversionPaymentToken
  >;
const mockUseAccountTokens = useAccountTokens as jest.MockedFunction<
  typeof useAccountTokens
>;

describe('useMusdConversionTokens', () => {
  const mockAllowlist: Record<Hex, Hex[]> = {
    '0x1': [
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
      '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
    ],
    '0xe708': [
      '0x176211869ca2b568f2a7d4ee941e073a821ee1ff', // USDC on Linea
    ],
  };

  const mockUsdcMainnet: AssetType = {
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    chainId: '0x1',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    balance: '1000000',
    logo: 'https://example.com/usdc.png',
    isETH: false,
    aggregators: [],
    image: 'https://example.com/usdc.png',
  };

  const mockUsdtMainnet: AssetType = {
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    chainId: '0x1',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    balance: '2000000',
    logo: 'https://example.com/usdt.png',
    isETH: false,
    aggregators: [],
    image: 'https://example.com/usdt.png',
  };

  const mockUsdcLinea: AssetType = {
    address: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
    chainId: '0xe708',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    balance: '500000',
    logo: 'https://example.com/usdc.png',
    isETH: false,
    aggregators: [],
    image: 'https://example.com/usdc.png',
  };

  const mockDaiMainnet: AssetType = {
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    chainId: '0x1',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    balance: '3000000',
    logo: 'https://example.com/dai.png',
    isETH: false,
    aggregators: [],
    image: 'https://example.com/dai.png',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectMusdConversionPaymentTokensAllowlist) {
        return mockAllowlist;
      }
      return undefined;
    });
    mockUseAccountTokens.mockReturnValue([]);
    mockIsMusdConversionPaymentToken.mockReturnValue(false);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('hook structure', () => {
    it('returns object with tokenFilter, isConversionToken, and tokens properties', () => {
      const { result } = renderHook(() => useMusdConversionTokens());

      expect(result.current).toHaveProperty('tokenFilter');
      expect(result.current).toHaveProperty('isConversionToken');
      expect(result.current).toHaveProperty('tokens');
    });

    it('returns tokenFilter as a function', () => {
      const { result } = renderHook(() => useMusdConversionTokens());

      expect(typeof result.current.tokenFilter).toBe('function');
    });

    it('returns isConversionToken as a function', () => {
      const { result } = renderHook(() => useMusdConversionTokens());

      expect(typeof result.current.isConversionToken).toBe('function');
    });

    it('returns tokens as an array', () => {
      const { result } = renderHook(() => useMusdConversionTokens());

      expect(Array.isArray(result.current.tokens)).toBe(true);
    });
  });

  describe('token filtering', () => {
    it('filters tokens correctly based on allowlist', () => {
      mockUseAccountTokens.mockReturnValue([
        mockUsdcMainnet,
        mockUsdtMainnet,
        mockDaiMainnet,
      ]);
      mockIsMusdConversionPaymentToken.mockImplementation(
        (address, _allowlist, chainId) => {
          if (chainId === '0x1') {
            return (
              address.toLowerCase() === mockUsdcMainnet.address.toLowerCase() ||
              address.toLowerCase() === mockUsdtMainnet.address.toLowerCase()
            );
          }
          return false;
        },
      );

      const { result } = renderHook(() => useMusdConversionTokens());

      expect(result.current.tokens).toHaveLength(2);
      expect(result.current.tokens).toContainEqual(mockUsdcMainnet);
      expect(result.current.tokens).toContainEqual(mockUsdtMainnet);
      expect(result.current.tokens).not.toContainEqual(mockDaiMainnet);
    });

    it('returns empty array when no tokens match allowlist', () => {
      mockUseAccountTokens.mockReturnValue([mockDaiMainnet]);
      mockIsMusdConversionPaymentToken.mockReturnValue(false);

      const { result } = renderHook(() => useMusdConversionTokens());

      expect(result.current.tokens).toEqual([]);
    });

    it('filters tokens from multiple chains correctly', () => {
      mockUseAccountTokens.mockReturnValue([
        mockUsdcMainnet,
        mockUsdcLinea,
        mockDaiMainnet,
      ]);
      mockIsMusdConversionPaymentToken.mockImplementation(
        (address, _allowlist, chainId) => {
          if (chainId === '0x1') {
            return (
              address.toLowerCase() === mockUsdcMainnet.address.toLowerCase()
            );
          }
          if (chainId === '0xe708') {
            return (
              address.toLowerCase() === mockUsdcLinea.address.toLowerCase()
            );
          }
          return false;
        },
      );

      const { result } = renderHook(() => useMusdConversionTokens());

      expect(result.current.tokens).toHaveLength(2);
      expect(result.current.tokens).toContainEqual(mockUsdcMainnet);
      expect(result.current.tokens).toContainEqual(mockUsdcLinea);
      expect(result.current.tokens).not.toContainEqual(mockDaiMainnet);
    });

    it('handles tokens with different case addresses', () => {
      const uppercaseUsdcMainnet: AssetType = {
        ...mockUsdcMainnet,
        address: mockUsdcMainnet.address.toUpperCase() as Hex,
      };
      mockUseAccountTokens.mockReturnValue([uppercaseUsdcMainnet]);
      mockIsMusdConversionPaymentToken.mockReturnValue(true);

      const { result } = renderHook(() => useMusdConversionTokens());

      expect(result.current.tokens).toHaveLength(1);
      expect(result.current.tokens[0]).toEqual(uppercaseUsdcMainnet);
    });
  });

  describe('isConversionToken', () => {
    it('returns true for token in conversion tokens list with matching address and chainId', () => {
      mockUseAccountTokens.mockReturnValue([mockUsdcMainnet]);
      mockIsMusdConversionPaymentToken.mockReturnValue(true);

      const { result } = renderHook(() => useMusdConversionTokens());
      const isConversion = result.current.isConversionToken(mockUsdcMainnet);

      expect(isConversion).toBe(true);
    });

    it('returns false for token not in conversion tokens list', () => {
      mockUseAccountTokens.mockReturnValue([mockUsdcMainnet]);
      mockIsMusdConversionPaymentToken.mockReturnValue(true);

      const { result } = renderHook(() => useMusdConversionTokens());
      const isConversion = result.current.isConversionToken(mockDaiMainnet);

      expect(isConversion).toBe(false);
    });

    it('returns false when token is undefined', () => {
      mockUseAccountTokens.mockReturnValue([mockUsdcMainnet]);
      mockIsMusdConversionPaymentToken.mockReturnValue(true);

      const { result } = renderHook(() => useMusdConversionTokens());
      const isConversion = result.current.isConversionToken(undefined);

      expect(isConversion).toBe(false);
    });

    it('returns false when token address matches but chainId differs', () => {
      const usdcWithDifferentChain: AssetType = {
        ...mockUsdcMainnet,
        chainId: '0x89', // Polygon
      };
      mockUseAccountTokens.mockReturnValue([mockUsdcMainnet]);
      mockIsMusdConversionPaymentToken.mockReturnValue(true);

      const { result } = renderHook(() => useMusdConversionTokens());
      const isConversion = result.current.isConversionToken(
        usdcWithDifferentChain,
      );

      expect(isConversion).toBe(false);
    });

    it('performs case-insensitive address comparison', () => {
      const uppercaseUsdcMainnet: AssetType = {
        ...mockUsdcMainnet,
        address: mockUsdcMainnet.address.toUpperCase() as Hex,
      };
      mockUseAccountTokens.mockReturnValue([mockUsdcMainnet]);
      mockIsMusdConversionPaymentToken.mockReturnValue(true);

      const { result } = renderHook(() => useMusdConversionTokens());
      const isConversion =
        result.current.isConversionToken(uppercaseUsdcMainnet);

      expect(isConversion).toBe(true);
    });
  });

  describe('tokenFilter callback', () => {
    it('filters array of tokens correctly', () => {
      mockUseAccountTokens.mockReturnValue([]);
      mockIsMusdConversionPaymentToken.mockImplementation(
        (address, _allowlist, chainId) => {
          if (chainId === '0x1') {
            return (
              address.toLowerCase() === mockUsdcMainnet.address.toLowerCase()
            );
          }
          return false;
        },
      );

      const { result } = renderHook(() => useMusdConversionTokens());
      const filtered = result.current.tokenFilter([
        mockUsdcMainnet,
        mockDaiMainnet,
      ]);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]).toEqual(mockUsdcMainnet);
    });

    it('returns empty array when given empty array', () => {
      mockUseAccountTokens.mockReturnValue([]);

      const { result } = renderHook(() => useMusdConversionTokens());
      const filtered = result.current.tokenFilter([]);

      expect(filtered).toEqual([]);
    });

    it('maintains referential equality across renders with same allowlist', () => {
      mockUseAccountTokens.mockReturnValue([mockUsdcMainnet]);

      const { result, rerender } = renderHook(() => useMusdConversionTokens());
      const firstTokenFilter = result.current.tokenFilter;

      rerender();
      const secondTokenFilter = result.current.tokenFilter;

      expect(firstTokenFilter).toBe(secondTokenFilter);
    });

    it('creates new tokenFilter when allowlist changes', () => {
      mockUseAccountTokens.mockReturnValue([mockUsdcMainnet]);

      const { result, rerender } = renderHook(() => useMusdConversionTokens());
      const firstTokenFilter = result.current.tokenFilter;

      const newAllowlist: Record<Hex, Hex[]> = {
        '0x1': ['0x6b175474e89094c44da98b954eedeac495271d0f'],
      };
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMusdConversionPaymentTokensAllowlist) {
          return newAllowlist;
        }
        return undefined;
      });

      rerender();
      const secondTokenFilter = result.current.tokenFilter;

      expect(firstTokenFilter).not.toBe(secondTokenFilter);
    });
  });

  describe('integration with dependencies', () => {
    it('uses allowlist from selector correctly', () => {
      mockUseAccountTokens.mockReturnValue([mockUsdcMainnet]);
      mockIsMusdConversionPaymentToken.mockReturnValue(true);

      renderHook(() => useMusdConversionTokens());

      expect(mockUseSelector).toHaveBeenCalled();
    });

    it('uses tokens from useAccountTokens hook', () => {
      const allTokens = [mockUsdcMainnet, mockUsdtMainnet];
      mockUseAccountTokens.mockReturnValue(allTokens);

      renderHook(() => useMusdConversionTokens());

      expect(mockUseAccountTokens).toHaveBeenCalledWith({
        includeNoBalance: false,
      });
    });

    it('calls isMusdConversionPaymentToken utility with correct parameters', () => {
      mockUseAccountTokens.mockReturnValue([mockUsdcMainnet]);
      mockIsMusdConversionPaymentToken.mockReturnValue(true);

      renderHook(() => useMusdConversionTokens());

      expect(mockIsMusdConversionPaymentToken).toHaveBeenCalledWith(
        mockUsdcMainnet.address,
        mockAllowlist,
        mockUsdcMainnet.chainId,
      );
    });
  });

  describe('edge cases', () => {
    it('handles empty allowlist correctly', () => {
      const emptyAllowlist: Record<Hex, Hex[]> = {};
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMusdConversionPaymentTokensAllowlist) {
          return emptyAllowlist;
        }
        return undefined;
      });
      mockUseAccountTokens.mockReturnValue([mockUsdcMainnet]);
      mockIsMusdConversionPaymentToken.mockReturnValue(false);

      const { result } = renderHook(() => useMusdConversionTokens());

      expect(result.current.tokens).toEqual([]);
    });

    it('handles empty token list from useAccountTokens', () => {
      mockUseAccountTokens.mockReturnValue([]);

      const { result } = renderHook(() => useMusdConversionTokens());

      expect(result.current.tokens).toEqual([]);
    });

    it('handles tokens without chainId property', () => {
      const tokenWithoutChainId = {
        ...mockUsdcMainnet,
        chainId: undefined,
      } as unknown as AssetType;
      mockUseAccountTokens.mockReturnValue([tokenWithoutChainId]);
      mockIsMusdConversionPaymentToken.mockImplementation(
        (_address, _allowlist, chainId) => {
          if (!chainId) {
            return false;
          }
          return true;
        },
      );

      const { result } = renderHook(() => useMusdConversionTokens());

      expect(result.current.tokens).toEqual([]);
    });

    it('handles tokens without address property gracefully', () => {
      const tokenWithoutAddress = {
        ...mockUsdcMainnet,
        address: '',
      } as AssetType;
      mockUseAccountTokens.mockReturnValue([tokenWithoutAddress]);
      mockIsMusdConversionPaymentToken.mockReturnValue(false);

      const { result } = renderHook(() => useMusdConversionTokens());

      expect(result.current.tokens).toEqual([]);
    });
  });
});
