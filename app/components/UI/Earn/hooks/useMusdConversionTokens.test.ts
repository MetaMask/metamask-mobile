import { renderHook } from '@testing-library/react-hooks';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useMusdConversionTokens } from './useMusdConversionTokens';
import {
  selectMusdConversionMinAssetBalanceRequired,
  selectMusdConversionPaymentTokensAllowlist,
  selectMusdConversionPaymentTokensBlocklist,
} from '../selectors/featureFlags';
import { isTokenAllowed, WildcardTokenList } from '../utils/wildcardTokenList';
import { AssetType } from '../../../Views/confirmations/types/token';
import { useAccountTokens } from '../../../Views/confirmations/hooks/send/useAccountTokens';

jest.mock('react-redux');
jest.mock('../selectors/featureFlags');
jest.mock('../utils/wildcardTokenList');
jest.mock('../../../Views/confirmations/hooks/send/useAccountTokens');

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockIsTokenAllowed = isTokenAllowed as jest.MockedFunction<
  typeof isTokenAllowed
>;
const mockUseAccountTokens = useAccountTokens as jest.MockedFunction<
  typeof useAccountTokens
>;

describe('useMusdConversionTokens', () => {
  const mockAllowlist: WildcardTokenList = {
    '0x1': ['USDC', 'USDT'],
    '0xe708': ['USDC'],
  };

  const mockBlocklist: WildcardTokenList = {};

  const mockUsdcMainnet: AssetType = {
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    chainId: '0x1',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    balance: '1000000',
    fiat: {
      balance: 100,
      currency: 'usd',
      conversionRate: 1,
    },
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
    fiat: {
      balance: 200,
      currency: 'usd',
      conversionRate: 1,
    },
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
    fiat: {
      balance: 50,
      currency: 'usd',
      conversionRate: 1,
    },
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
    fiat: {
      balance: 300,
      currency: 'usd',
      conversionRate: 1,
    },
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
      if (selector === selectMusdConversionPaymentTokensBlocklist) {
        return mockBlocklist;
      }
      if (selector === selectMusdConversionMinAssetBalanceRequired) {
        return 0.01;
      }
      return undefined;
    });
    mockUseAccountTokens.mockReturnValue([]);
    mockIsTokenAllowed.mockReturnValue(false);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('hook structure', () => {
    it('returns object with filterAllowedTokens, isConversionToken, isMusdSupportedOnChain, and tokens properties', () => {
      const { result } = renderHook(() => useMusdConversionTokens());

      expect(result.current).toHaveProperty('filterAllowedTokens');
      expect(result.current).toHaveProperty('isConversionToken');
      expect(result.current).toHaveProperty('isMusdSupportedOnChain');
      expect(result.current).toHaveProperty('tokens');
    });

    it('returns filterAllowedTokens as a function', () => {
      const { result } = renderHook(() => useMusdConversionTokens());

      expect(typeof result.current.filterAllowedTokens).toBe('function');
    });

    it('returns isConversionToken as a function', () => {
      const { result } = renderHook(() => useMusdConversionTokens());

      expect(typeof result.current.isConversionToken).toBe('function');
    });

    it('returns isMusdSupportedOnChain as a function', () => {
      const { result } = renderHook(() => useMusdConversionTokens());

      expect(typeof result.current.isMusdSupportedOnChain).toBe('function');
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
      mockIsTokenAllowed.mockImplementation(
        (
          symbol: string,
          _allowlist?: WildcardTokenList,
          _blocklist?: WildcardTokenList,
          chainId?: string,
        ) => {
          if (chainId === '0x1') {
            return symbol === 'USDC' || symbol === 'USDT';
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
      mockIsTokenAllowed.mockReturnValue(false);

      const { result } = renderHook(() => useMusdConversionTokens());

      expect(result.current.tokens).toEqual([]);
    });

    it('filters tokens from multiple chains correctly', () => {
      mockUseAccountTokens.mockReturnValue([
        mockUsdcMainnet,
        mockUsdcLinea,
        mockDaiMainnet,
      ]);
      mockIsTokenAllowed.mockImplementation(
        (
          symbol: string,
          _allowlist?: WildcardTokenList,
          _blocklist?: WildcardTokenList,
          chainId?: string,
        ) => {
          if (chainId === '0x1') {
            return symbol === 'USDC';
          }
          if (chainId === '0xe708') {
            return symbol === 'USDC';
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
      mockIsTokenAllowed.mockReturnValue(true);

      const { result } = renderHook(() => useMusdConversionTokens());

      expect(result.current.tokens).toHaveLength(1);
      expect(result.current.tokens[0]).toEqual(uppercaseUsdcMainnet);
    });

    it('filters out token when fiat balance is below min threshold', () => {
      const usdcBelowMin: AssetType = {
        ...mockUsdcMainnet,
        fiat: {
          balance: 0.009,
          currency: 'usd',
          conversionRate: 1,
        },
      };

      mockUseAccountTokens.mockReturnValue([usdcBelowMin]);
      mockIsTokenAllowed.mockReturnValue(true);

      const { result } = renderHook(() => useMusdConversionTokens());

      expect(result.current.tokens).toEqual([]);
    });

    it('filters out token when fiat balance is below selector min threshold', () => {
      const usdcBelowSelectorMin: AssetType = {
        ...mockUsdcMainnet,
        fiat: {
          balance: 0.049,
          currency: 'usd',
          conversionRate: 1,
        },
      };

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMusdConversionPaymentTokensAllowlist) {
          return mockAllowlist;
        }
        if (selector === selectMusdConversionPaymentTokensBlocklist) {
          return mockBlocklist;
        }
        if (selector === selectMusdConversionMinAssetBalanceRequired) {
          return 0.05;
        }
        return undefined;
      });
      mockUseAccountTokens.mockReturnValue([usdcBelowSelectorMin]);
      mockIsTokenAllowed.mockReturnValue(true);

      const { result } = renderHook(() => useMusdConversionTokens());

      expect(result.current.tokens).toEqual([]);
    });

    it('includes token when fiat balance equals zero and minimum required balance is zero', () => {
      const usdcFiatZero: AssetType = {
        ...mockUsdcMainnet,
        rawBalance: '0x1',
        fiat: {
          balance: 0,
          currency: 'usd',
          conversionRate: 1,
        },
      };

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectMusdConversionPaymentTokensAllowlist) {
          return mockAllowlist;
        }
        if (selector === selectMusdConversionPaymentTokensBlocklist) {
          return mockBlocklist;
        }
        if (selector === selectMusdConversionMinAssetBalanceRequired) {
          return 0;
        }
        return undefined;
      });
      mockUseAccountTokens.mockReturnValue([usdcFiatZero]);
      mockIsTokenAllowed.mockReturnValue(true);

      const { result } = renderHook(() => useMusdConversionTokens());

      expect(result.current.tokens).toEqual([usdcFiatZero]);
    });
  });

  describe('isConversionToken', () => {
    it('returns true for token in conversion tokens list with matching address and chainId', () => {
      mockUseAccountTokens.mockReturnValue([mockUsdcMainnet]);
      mockIsTokenAllowed.mockReturnValue(true);

      const { result } = renderHook(() => useMusdConversionTokens());
      const isConversion = result.current.isConversionToken(mockUsdcMainnet);

      expect(isConversion).toBe(true);
    });

    it('returns false for token not in conversion tokens list', () => {
      mockUseAccountTokens.mockReturnValue([mockUsdcMainnet]);
      mockIsTokenAllowed.mockReturnValue(true);

      const { result } = renderHook(() => useMusdConversionTokens());
      const isConversion = result.current.isConversionToken(mockDaiMainnet);

      expect(isConversion).toBe(false);
    });

    it('returns false when token is undefined', () => {
      mockUseAccountTokens.mockReturnValue([mockUsdcMainnet]);
      mockIsTokenAllowed.mockReturnValue(true);

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
      mockIsTokenAllowed.mockReturnValue(true);

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
      mockIsTokenAllowed.mockReturnValue(true);

      const { result } = renderHook(() => useMusdConversionTokens());
      const isConversion =
        result.current.isConversionToken(uppercaseUsdcMainnet);

      expect(isConversion).toBe(true);
    });
  });

  describe('isMusdSupportedOnChain', () => {
    it('returns true for Ethereum mainnet', () => {
      const { result } = renderHook(() => useMusdConversionTokens());

      const isSupported = result.current.isMusdSupportedOnChain(
        CHAIN_IDS.MAINNET,
      );

      expect(isSupported).toBe(true);
    });

    it('returns true for Linea mainnet', () => {
      const { result } = renderHook(() => useMusdConversionTokens());

      const isSupported = result.current.isMusdSupportedOnChain(
        CHAIN_IDS.LINEA_MAINNET,
      );

      expect(isSupported).toBe(true);
    });

    it('returns true for BSC', () => {
      const { result } = renderHook(() => useMusdConversionTokens());

      const isSupported = result.current.isMusdSupportedOnChain(CHAIN_IDS.BSC);

      expect(isSupported).toBe(true);
    });

    it('returns false for unsupported chain', () => {
      const { result } = renderHook(() => useMusdConversionTokens());

      const isSupported = result.current.isMusdSupportedOnChain('0x89');

      expect(isSupported).toBe(false);
    });

    it('returns false for empty string', () => {
      const { result } = renderHook(() => useMusdConversionTokens());

      const isSupported = result.current.isMusdSupportedOnChain('');

      expect(isSupported).toBe(false);
    });
  });

  describe('filterAllowedTokens callback', () => {
    it('filters array of tokens correctly', () => {
      mockUseAccountTokens.mockReturnValue([]);
      mockIsTokenAllowed.mockImplementation(
        (
          symbol: string,
          _allowlist?: WildcardTokenList,
          _blocklist?: WildcardTokenList,
          chainId?: string,
        ) => {
          if (chainId === '0x1') {
            return symbol === 'USDC';
          }
          return false;
        },
      );

      const { result } = renderHook(() => useMusdConversionTokens());
      const filtered = result.current.filterAllowedTokens([
        mockUsdcMainnet,
        mockDaiMainnet,
      ]);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]).toEqual(mockUsdcMainnet);
    });

    it('returns empty array when given empty array', () => {
      mockUseAccountTokens.mockReturnValue([]);

      const { result } = renderHook(() => useMusdConversionTokens());
      const filtered = result.current.filterAllowedTokens([]);

      expect(filtered).toEqual([]);
    });

    it('maintains referential equality across renders with same allowlist', () => {
      mockUseAccountTokens.mockReturnValue([mockUsdcMainnet]);

      const { result, rerender } = renderHook(() => useMusdConversionTokens());
      const firstTokenFilter = result.current.filterAllowedTokens;

      rerender();
      const secondTokenFilter = result.current.filterAllowedTokens;

      expect(firstTokenFilter).toBe(secondTokenFilter);
    });

    it('creates new filterAllowedTokens when allowlist changes', () => {
      mockUseAccountTokens.mockReturnValue([mockUsdcMainnet]);

      const { result, rerender } = renderHook(() => useMusdConversionTokens());
      const firstTokenFilter = result.current.filterAllowedTokens;

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
      const secondTokenFilter = result.current.filterAllowedTokens;

      expect(firstTokenFilter).not.toBe(secondTokenFilter);
    });
  });

  describe('integration with dependencies', () => {
    it('uses allowlist from selector correctly', () => {
      mockUseAccountTokens.mockReturnValue([mockUsdcMainnet]);
      mockIsTokenAllowed.mockReturnValue(true);

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

    it('calls isTokenAllowed utility with correct parameters', () => {
      mockUseAccountTokens.mockReturnValue([mockUsdcMainnet]);
      mockIsTokenAllowed.mockReturnValue(true);

      renderHook(() => useMusdConversionTokens());

      expect(mockIsTokenAllowed).toHaveBeenCalledWith(
        mockUsdcMainnet.symbol,
        mockAllowlist,
        mockBlocklist,
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
      mockIsTokenAllowed.mockReturnValue(false);

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
      mockIsTokenAllowed.mockImplementation(
        (
          _symbol: string,
          _allowlist?: WildcardTokenList,
          _blocklist?: WildcardTokenList,
          chainId?: string,
        ) => {
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
      mockIsTokenAllowed.mockReturnValue(false);

      const { result } = renderHook(() => useMusdConversionTokens());

      expect(result.current.tokens).toEqual([]);
    });
  });
});
