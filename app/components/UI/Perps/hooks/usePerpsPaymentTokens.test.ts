import { renderHook } from '@testing-library/react-native';
import type { BridgeToken } from '../../Bridge/types';
import type { AccountState } from '../controllers/types';
import { usePerpsPaymentTokens } from './usePerpsPaymentTokens';

// Mock all dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock('../../Bridge/hooks/useTokensWithBalance');
jest.mock('../utils/tokenIconUtils');
jest.mock('./index');
jest.mock('./stream');
jest.mock('../../../../selectors/networkController');
jest.mock('../../../../selectors/tokenListController');
jest.mock('../../../../selectors/preferencesController');

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock constants
jest.mock('../constants/hyperLiquidConfig', () => ({
  HYPERLIQUID_MAINNET_CHAIN_ID: '0x3e7',
  HYPERLIQUID_TESTNET_CHAIN_ID: '0x1ee7',
  USDC_SYMBOL: 'USDC',
  USDC_DECIMALS: 6,
  USDC_ARBITRUM_MAINNET_ADDRESS: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  TRADING_DEFAULTS: {
    amount: {
      mainnet: 10,
      testnet: 11,
    },
  },
}));

const mockUseSelector = jest.requireMock('react-redux').useSelector;
const mockUseTokensWithBalance = jest.requireMock(
  '../../Bridge/hooks/useTokensWithBalance',
);
const mockEnhanceTokenWithIcon = jest.requireMock('../utils/tokenIconUtils');
const mockUsePerpsLiveAccount =
  jest.requireMock('./stream').usePerpsLiveAccount;
const mockUsePerpsNetwork = jest.requireMock('./index').usePerpsNetwork;

describe('usePerpsPaymentTokens', () => {
  const mockNetworkConfigurations = {
    '0x1': { chainId: '0x1', name: 'Ethereum', ticker: 'ETH' },
    '0xa4b1': { chainId: '0xa4b1', name: 'Arbitrum', ticker: 'ETH' },
    '0x89': { chainId: '0x89', name: 'Polygon', ticker: 'MATIC' },
  };

  const mockTokenList = {
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': {
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
      iconUrl: 'https://example.com/usdc-icon.png',
      aggregators: [],
      occurrences: 1,
    },
  };

  const mockAccountState: AccountState = {
    availableBalance: '1000.50',
    marginUsed: '300.25',
    unrealizedPnl: '50.25',
    returnOnEquity: '0',
    totalBalance: '10000',
  };

  const mockTokensWithBalance: BridgeToken[] = [
    {
      address: '0xusdc-arbitrum',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: '0xa4b1',
      balance: '500000000',
      balanceFiat: '$500.00',
      image: 'https://example.com/usdc.png',
    },
    {
      address: '0xeth',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      chainId: '0x1',
      balance: '2500000000000000000',
      balanceFiat: '$5000.00',
      image: 'https://example.com/eth.png',
    },
    {
      address: '0xlow-balance',
      symbol: 'LOW',
      name: 'Low Balance Token',
      decimals: 18,
      chainId: '0x1',
      balance: '1000000000000000',
      balanceFiat: '$5.00',
      image: 'https://example.com/low.png',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up mock return values
    mockUseSelector
      .mockReturnValueOnce(mockNetworkConfigurations) // selectNetworkConfigurations
      .mockReturnValueOnce(mockTokenList) // selectTokenList
      .mockReturnValueOnce(false); // selectIsIpfsGatewayEnabled

    mockUseTokensWithBalance.useTokensWithBalance.mockReturnValue(
      mockTokensWithBalance,
    );
    mockUsePerpsLiveAccount.mockReturnValue({
      account: mockAccountState,
      isInitialLoading: false,
    });
    mockUsePerpsNetwork.mockReturnValue('mainnet');
    mockEnhanceTokenWithIcon.enhanceTokenWithIcon.mockImplementation(
      ({ token }: { token: BridgeToken }) => ({
        ...token,
        image: `enhanced-${token.symbol?.toLowerCase()}.png`,
      }),
    );
  });

  describe('Basic functionality', () => {
    it('returns payment tokens array', () => {
      const { result } = renderHook(() => usePerpsPaymentTokens());

      expect(Array.isArray(result.current)).toBe(true);
      expect(result.current.length).toBeGreaterThan(0);
    });

    it('includes Hyperliquid USDC as first token', () => {
      const { result } = renderHook(() => usePerpsPaymentTokens());

      const firstToken = result.current[0];
      expect(firstToken.symbol).toBe('USDC');
      expect(firstToken.name).toBe('USDC • Hyperliquid');
      expect(firstToken.chainId).toBe('0x3e7');
    });

    it('calculates Hyperliquid USDC balance correctly', () => {
      const { result } = renderHook(() => usePerpsPaymentTokens());

      const hyperliquidUsdc = result.current[0];
      expect(hyperliquidUsdc.balance).toBe('1000500000');
      expect(hyperliquidUsdc.balanceFiat).toBe('$1000.50');
    });
  });

  describe('Network handling', () => {
    it('uses testnet chain ID when on testnet', () => {
      mockUsePerpsNetwork.mockReturnValue('testnet');

      const { result } = renderHook(() => usePerpsPaymentTokens());

      const hyperliquidUsdc = result.current[0];
      expect(hyperliquidUsdc.chainId).toBe('0x1ee7');
    });

    it('uses mainnet chain ID when on mainnet', () => {
      mockUsePerpsNetwork.mockReturnValue('mainnet');

      const { result } = renderHook(() => usePerpsPaymentTokens());

      const hyperliquidUsdc = result.current[0];
      expect(hyperliquidUsdc.chainId).toBe('0x3e7');
    });

    it('handles missing network configurations', () => {
      // Clear previous mock setup and set new values
      mockUseSelector.mockClear();
      mockUseSelector
        .mockReturnValueOnce(null) // selectNetworkConfigurations
        .mockReturnValueOnce(mockTokenList) // selectTokenList
        .mockReturnValueOnce(false); // selectIsIpfsGatewayEnabled

      const { result } = renderHook(() => usePerpsPaymentTokens());

      expect(result.current[0].symbol).toBe('USDC');
    });
  });

  describe('Token filtering by minimum balance', () => {
    it('shows all tokens regardless of balance on mainnet', () => {
      mockUsePerpsNetwork.mockReturnValue('mainnet');

      const { result } = renderHook(() => usePerpsPaymentTokens());

      const tokenSymbols = result.current.map((token) => token.symbol);
      expect(tokenSymbols).toContain('USDC');
      expect(tokenSymbols).toContain('ETH');
      expect(tokenSymbols).toContain('LOW');
    });

    it('shows all tokens regardless of balance on testnet', () => {
      mockUsePerpsNetwork.mockReturnValue('testnet');

      const { result } = renderHook(() => usePerpsPaymentTokens());

      const tokenSymbols = result.current.map((token) => token.symbol);
      expect(tokenSymbols).toContain('USDC');
      expect(tokenSymbols).toContain('ETH');
      expect(tokenSymbols).toContain('LOW');
    });

    it('excludes Hyperliquid chain tokens from other tokens list', () => {
      const tokensWithHyperliquid = [
        ...mockTokensWithBalance,
        {
          address: '0xhyperliquid-token',
          symbol: 'HYP',
          name: 'Hyperliquid Token',
          decimals: 18,
          chainId: '0x3e7',
          balance: '1000000000000000000000',
          balanceFiat: '$1000.00',
          image: 'https://example.com/hyp.png',
        },
      ];

      mockUseTokensWithBalance.useTokensWithBalance.mockReturnValue(
        tokensWithHyperliquid,
      );

      const { result } = renderHook(() => usePerpsPaymentTokens());

      const nonHyperliquidTokens = result.current.slice(1);
      const tokenSymbols = nonHyperliquidTokens.map((token) => token.symbol);
      expect(tokenSymbols).not.toContain('HYP');
    });
  });

  describe('Token sorting priority', () => {
    it('sorts USDC tokens before others', () => {
      const { result } = renderHook(() => usePerpsPaymentTokens());

      const otherTokens = result.current.slice(1);
      const usdcIndex = otherTokens.findIndex(
        (token) => token.symbol === 'USDC',
      );
      const ethIndex = otherTokens.findIndex((token) => token.symbol === 'ETH');

      expect(usdcIndex).toBeLessThan(ethIndex);
    });

    it('sorts by balance within same token type', () => {
      const extraTokens = [
        ...mockTokensWithBalance,
        {
          address: '0xusdc-polygon',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          chainId: '0x89',
          balance: '100000000',
          balanceFiat: '$100.00',
          image: 'https://example.com/usdc.png',
        },
      ];

      mockUseTokensWithBalance.useTokensWithBalance.mockReturnValue(
        extraTokens,
      );

      const { result } = renderHook(() => usePerpsPaymentTokens());

      const otherTokens = result.current.slice(1);
      const usdcTokens = otherTokens.filter((token) => token.symbol === 'USDC');

      if (usdcTokens.length > 1) {
        const firstBalance = Number.parseFloat(
          usdcTokens[0].balanceFiat?.replace(/[^0-9.-]+/g, '') || '0',
        );
        const secondBalance = Number.parseFloat(
          usdcTokens[1].balanceFiat?.replace(/[^0-9.-]+/g, '') || '0',
        );
        expect(firstBalance).toBeGreaterThan(secondBalance);
      }
    });
  });

  describe('Token enhancement', () => {
    it('enhances tokens with icons', () => {
      renderHook(() => usePerpsPaymentTokens());

      expect(
        mockEnhanceTokenWithIcon.enhanceTokenWithIcon,
      ).toHaveBeenCalledWith({
        token: expect.objectContaining({
          symbol: 'USDC',
          name: 'USDC • Hyperliquid',
        }),
        tokenList: mockTokenList,
        isIpfsGatewayEnabled: false,
      });
    });
  });

  describe('Edge cases', () => {
    it('handles zero Hyperliquid balance', () => {
      const zeroBalanceAccountState = {
        ...mockAccountState,
        availableBalance: '0',
      };

      mockUsePerpsLiveAccount.mockReturnValue({
        account: zeroBalanceAccountState,
        isInitialLoading: false,
      });

      const { result } = renderHook(() => usePerpsPaymentTokens());

      const hyperliquidUsdc = result.current[0];
      expect(hyperliquidUsdc.balance).toBe('0');
      expect(hyperliquidUsdc.balanceFiat).toBe('$0.00');
    });

    it('handles null account state', () => {
      mockUsePerpsLiveAccount.mockReturnValue({
        account: null,
        isInitialLoading: false,
      });

      const { result } = renderHook(() => usePerpsPaymentTokens());

      const hyperliquidUsdc = result.current[0];
      expect(hyperliquidUsdc.balance).toBe('0');
      expect(hyperliquidUsdc.balanceFiat).toBe('$0.00');
    });

    it('handles empty tokens with balance', () => {
      mockUseTokensWithBalance.useTokensWithBalance.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsPaymentTokens());

      expect(result.current).toHaveLength(1);
      expect(result.current[0].symbol).toBe('USDC');
    });

    it('handles missing token list', () => {
      // Clear previous mock setup and set new values
      mockUseSelector.mockClear();
      mockUseSelector
        .mockReturnValueOnce(mockNetworkConfigurations) // selectNetworkConfigurations
        .mockReturnValueOnce(null) // selectTokenList
        .mockReturnValueOnce(false); // selectIsIpfsGatewayEnabled

      const { result } = renderHook(() => usePerpsPaymentTokens());

      expect(result.current.length).toBeGreaterThan(0);
    });

    it('handles malformed balance fiat values', () => {
      const tokensWithMalformedFiat = [
        {
          ...mockTokensWithBalance[0],
          balanceFiat: 'invalid-fiat-value',
        },
        {
          ...mockTokensWithBalance[1],
          balanceFiat: undefined,
        },
      ];

      mockUseTokensWithBalance.useTokensWithBalance.mockReturnValue(
        tokensWithMalformedFiat,
      );

      const { result } = renderHook(() => usePerpsPaymentTokens());

      // Should include Hyperliquid USDC + 2 tokens with malformed fiat (with fallback values)
      expect(result.current).toHaveLength(3);
      // Token with invalid fiat value should still be included
      const tokenWithInvalidFiat = result.current.find(
        (token) => token.address === mockTokensWithBalance[0].address,
      );
      expect(tokenWithInvalidFiat).toBeDefined();
      expect(tokenWithInvalidFiat?.balanceFiat).toBe('invalid-fiat-value');
      // Token with undefined fiat should have fallback
      const tokenWithUndefinedFiat = result.current.find(
        (token) => token.address === mockTokensWithBalance[1].address,
      );
      expect(tokenWithUndefinedFiat).toBeDefined();
      expect(tokenWithUndefinedFiat?.balanceFiat).toBe('$0.00');
    });
  });

  describe('Required fields validation', () => {
    it('ensures all returned tokens have required fields', () => {
      const { result } = renderHook(() => usePerpsPaymentTokens());

      result.current.forEach((token) => {
        expect(token).toHaveProperty('symbol');
        expect(token).toHaveProperty('address');
        expect(token).toHaveProperty('chainId');
        expect(token).toHaveProperty('decimals');
        expect(token).toHaveProperty('balance');
        expect(token).toHaveProperty('balanceFiat');
        expect(typeof token.symbol).toBe('string');
        expect(typeof token.address).toBe('string');
        expect(typeof token.chainId).toBe('string');
        expect(typeof token.decimals).toBe('number');
        expect(typeof token.balance).toBe('string');
        expect(typeof token.balanceFiat).toBe('string');
      });
    });

    it('provides fallback values for missing fields', () => {
      const tokensWithMissingFields = [
        {
          address: '0xincomplete',
          symbol: 'INC',
          name: 'Incomplete Token',
          decimals: 18,
          chainId: '0x1',
          balanceFiat: '$50.00',
          image: 'https://example.com/inc.png',
        },
      ];

      mockUseTokensWithBalance.useTokensWithBalance.mockReturnValue(
        tokensWithMissingFields as BridgeToken[],
      );

      const { result } = renderHook(() => usePerpsPaymentTokens());

      const incompleteToken = result.current.find(
        (token) => token.symbol === 'INC',
      );
      expect(incompleteToken?.balance).toBe('0');
    });
  });
});
