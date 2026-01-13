import { initialState, ethChainId } from '../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useTokens } from './useTokens';
import { waitFor } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import { zeroAddress } from 'ethereumjs-util';
import { POLYGON_NATIVE_TOKEN } from '../constants/assets';

// Mock dependencies
jest.mock('../../../../util/networks', () => ({
  ...jest.requireActual('../../../../util/networks'),
  isPortfolioViewEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock('../../Tokens/util', () => ({
  ...jest.requireActual('../../Tokens/util'),
  sortAssets: jest.fn().mockImplementation((assets) => assets),
}));

jest.mock('./useTokensWithBalance', () => ({
  useTokensWithBalance: jest.fn(),
}));

jest.mock('./useTopTokens', () => ({
  useTopTokens: jest.fn(),
}));

jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  isNonEvmChainId: jest.fn().mockReturnValue(false),
  formatAddressToAssetId: jest.fn((address) => address),
}));

import { useTokensWithBalance } from './useTokensWithBalance';
import { useTopTokens } from './useTopTokens';
import {
  isNonEvmChainId,
  formatAddressToAssetId,
} from '@metamask/bridge-controller';
import { TrxScope } from '@metamask/keyring-api';

const polygonChainId = '0x89' as Hex;

describe('useTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Polygon native token normalization', () => {
    it('prevents duplicate when topTokens has zero address and tokensWithBalance has native token address', async () => {
      const polygonNativeToken = {
        address: POLYGON_NATIVE_TOKEN,
        symbol: 'POL',
        name: 'Polygon',
        decimals: 18,
        chainId: polygonChainId,
        balance: '10.0',
        balanceFiat: '$15.50',
        tokenFiatAmount: 15.5,
      };

      // Mock useTokensWithBalance to return Polygon native token
      (useTokensWithBalance as jest.Mock).mockReturnValue([polygonNativeToken]);

      // Mock useTopTokens to return zero address variant
      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: [
          {
            address: zeroAddress(),
            symbol: 'POL',
            name: 'Polygon',
            decimals: 18,
            chainId: polygonChainId,
          },
        ],
        remainingTokens: [],
        pending: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            topTokensChainId: polygonChainId,
            balanceChainIds: [polygonChainId],
          }),
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        // Only one token should appear (the one with balance)
        const polygonTokens = result.current.tokensToRender.filter(
          (token) => token.chainId === polygonChainId,
        );

        expect(polygonTokens.length).toBe(1);
        expect(polygonTokens[0].address).toBe(POLYGON_NATIVE_TOKEN);
        expect(polygonTokens[0].balance).toBe('10.0');
      });
    });

    it('prevents duplicate when topTokens has native token address and tokensWithBalance has zero address', async () => {
      const polygonZeroAddressToken = {
        address: zeroAddress(),
        symbol: 'POL',
        name: 'Polygon',
        decimals: 18,
        chainId: polygonChainId,
        balance: '10.0',
        balanceFiat: '$15.50',
        tokenFiatAmount: 15.5,
      };

      // Mock useTokensWithBalance to return zero address variant
      (useTokensWithBalance as jest.Mock).mockReturnValue([
        polygonZeroAddressToken,
      ]);

      // Mock useTopTokens to return native token address variant
      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: [
          {
            address: POLYGON_NATIVE_TOKEN,
            symbol: 'POL',
            name: 'Polygon',
            decimals: 18,
            chainId: polygonChainId,
          },
        ],
        remainingTokens: [],
        pending: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            topTokensChainId: polygonChainId,
            balanceChainIds: [polygonChainId],
          }),
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        // Only one token should appear (the one with balance)
        const polygonTokens = result.current.tokensToRender.filter(
          (token) => token.chainId === polygonChainId,
        );

        expect(polygonTokens.length).toBe(1);
        expect(polygonTokens[0].address).toBe(zeroAddress());
        expect(polygonTokens[0].balance).toBe('10.0');
      });
    });

    it('prevents duplicate Polygon tokens with different addresses from rendering', async () => {
      const polygonNativeToken = {
        address: POLYGON_NATIVE_TOKEN,
        symbol: 'POL',
        name: 'Polygon',
        decimals: 18,
        chainId: polygonChainId,
        balance: '10.0',
        balanceFiat: '$15.50',
        tokenFiatAmount: 15.5,
      };

      const regularToken = {
        address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0' as Hex,
        symbol: 'MATIC',
        name: 'Matic Token',
        decimals: 18,
        chainId: polygonChainId,
        balance: '20.0',
        balanceFiat: '$31.00',
        tokenFiatAmount: 31.0,
      };

      (useTokensWithBalance as jest.Mock).mockReturnValue([
        polygonNativeToken,
        regularToken,
      ]);

      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: [
          {
            address: zeroAddress(),
            symbol: 'POL',
            name: 'Polygon',
            decimals: 18,
            chainId: polygonChainId,
          },
        ],
        remainingTokens: [],
        pending: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            topTokensChainId: polygonChainId,
            balanceChainIds: [polygonChainId],
          }),
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        const polygonTokens = result.current.tokensToRender.filter(
          (token) =>
            token.chainId === polygonChainId &&
            (token.address === POLYGON_NATIVE_TOKEN ||
              token.address === zeroAddress()),
        );

        // Only one Polygon native token should appear (the one with balance)
        expect(polygonTokens.length).toBe(1);
        expect(polygonTokens[0].address).toBe(POLYGON_NATIVE_TOKEN);
        expect(polygonTokens[0].balance).toBe('10.0');

        // Regular token should still appear
        const maticToken = result.current.tokensToRender.find(
          (token) =>
            token.address === '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
        );
        expect(maticToken).toBeDefined();
      });
    });

    it('excludes Polygon native token when specified with zero address', async () => {
      const polygonNativeToken = {
        address: POLYGON_NATIVE_TOKEN,
        symbol: 'POL',
        name: 'Polygon',
        decimals: 18,
        chainId: polygonChainId,
        balance: '10.0',
        balanceFiat: '$15.50',
        tokenFiatAmount: 15.5,
      };

      (useTokensWithBalance as jest.Mock).mockReturnValue([polygonNativeToken]);

      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: [],
        remainingTokens: [],
        pending: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            topTokensChainId: polygonChainId,
            balanceChainIds: [polygonChainId],
            tokensToExclude: [
              {
                address: zeroAddress(),
                chainId: polygonChainId,
              },
            ],
          }),
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        const polygonTokens = result.current.tokensToRender.filter(
          (token) => token.chainId === polygonChainId,
        );

        // Token should be excluded due to normalization
        expect(polygonTokens.length).toBe(0);
      });
    });

    it('excludes Polygon native token when specified with native token address', async () => {
      const polygonNativeToken = {
        address: POLYGON_NATIVE_TOKEN,
        symbol: 'POL',
        name: 'Polygon',
        decimals: 18,
        chainId: polygonChainId,
        balance: '10.0',
        balanceFiat: '$15.50',
        tokenFiatAmount: 15.5,
      };

      (useTokensWithBalance as jest.Mock).mockReturnValue([polygonNativeToken]);

      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: [],
        remainingTokens: [],
        pending: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            topTokensChainId: polygonChainId,
            balanceChainIds: [polygonChainId],
            tokensToExclude: [
              {
                address: POLYGON_NATIVE_TOKEN,
                chainId: polygonChainId,
              },
            ],
          }),
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        const polygonTokens = result.current.tokensToRender.filter(
          (token) => token.chainId === polygonChainId,
        );

        // Token should be excluded
        expect(polygonTokens.length).toBe(0);
      });
    });

    it('does not affect non-Polygon tokens', async () => {
      const ethNativeToken = {
        address: zeroAddress(),
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        chainId: ethChainId,
        balance: '3.0',
        balanceFiat: '$6000',
        tokenFiatAmount: 6000,
      };

      const regularToken = {
        address: '0x1234567890123456789012345678901234567890' as Hex,
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        chainId: ethChainId,
        balance: '100.0',
        balanceFiat: '$100',
        tokenFiatAmount: 100,
      };

      (useTokensWithBalance as jest.Mock).mockReturnValue([
        ethNativeToken,
        regularToken,
      ]);

      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: [],
        remainingTokens: [],
        pending: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            topTokensChainId: ethChainId,
            balanceChainIds: [ethChainId],
          }),
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        // Both Ethereum tokens should appear unchanged
        expect(result.current.tokensToRender.length).toBe(2);

        const ethToken = result.current.tokensToRender.find(
          (token) =>
            token.address === zeroAddress() && token.chainId === ethChainId,
        );
        expect(ethToken).toBeDefined();
        expect(ethToken?.symbol).toBe('ETH');

        const daiToken = result.current.tokensToRender.find(
          (token) =>
            token.address === '0x1234567890123456789012345678901234567890',
        );
        expect(daiToken).toBeDefined();
        expect(daiToken?.symbol).toBe('DAI');
      });
    });

    it('normalizes Polygon native token in allTokens array when combining tokensWithBalance and topTokens', async () => {
      const polygonNativeToken = {
        address: POLYGON_NATIVE_TOKEN,
        symbol: 'POL',
        name: 'Polygon',
        decimals: 18,
        chainId: polygonChainId,
        balance: '10.0',
        balanceFiat: '$15.50',
        tokenFiatAmount: 15.5,
      };

      (useTokensWithBalance as jest.Mock).mockReturnValue([polygonNativeToken]);

      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: [
          {
            address: zeroAddress(),
            symbol: 'POL',
            name: 'Polygon',
            decimals: 18,
            chainId: polygonChainId,
          },
        ],
        remainingTokens: [],
        pending: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            topTokensChainId: polygonChainId,
            balanceChainIds: [polygonChainId],
          }),
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        // Only one token should appear in allTokens (normalization prevents duplicate)
        const polygonTokens = result.current.allTokens.filter(
          (token) => token.chainId === polygonChainId,
        );

        expect(polygonTokens.length).toBe(1);
        expect(polygonTokens[0].address).toBe(POLYGON_NATIVE_TOKEN);
      });
    });

    it('handles mixed chain tokens with Polygon normalization preventing duplicates', async () => {
      const ethToken = {
        address: zeroAddress(),
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        chainId: ethChainId,
        balance: '1.0',
        balanceFiat: '$2000',
        tokenFiatAmount: 2000,
      };

      const polygonNativeToken = {
        address: POLYGON_NATIVE_TOKEN,
        symbol: 'POL',
        name: 'Polygon',
        decimals: 18,
        chainId: polygonChainId,
        balance: '100.0',
        balanceFiat: '$155',
        tokenFiatAmount: 155,
      };

      (useTokensWithBalance as jest.Mock).mockReturnValue([
        ethToken,
        polygonNativeToken,
      ]);

      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: [
          {
            address: zeroAddress(),
            symbol: 'POL',
            name: 'Polygon',
            decimals: 18,
            chainId: polygonChainId,
          },
        ],
        remainingTokens: [],
        pending: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            topTokensChainId: polygonChainId,
            balanceChainIds: [ethChainId, polygonChainId],
          }),
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        // Both tokens should appear, but Polygon native should only appear once (normalization prevents duplicate)
        expect(result.current.tokensToRender.length).toBe(2);

        // ETH token should be unaffected by Polygon normalization
        const ethNative = result.current.tokensToRender.find(
          (token) =>
            token.address === zeroAddress() && token.chainId === ethChainId,
        );
        expect(ethNative).toBeDefined();
        expect(ethNative?.symbol).toBe('ETH');

        // Polygon native should appear once with balance (topToken with zero address filtered out)
        const polygonNative = result.current.tokensToRender.find(
          (token) => token.chainId === polygonChainId,
        );
        expect(polygonNative).toBeDefined();
        expect(polygonNative?.address).toBe(POLYGON_NATIVE_TOKEN);
        expect(polygonNative?.balance).toBe('100.0');
      });
    });
  });

  describe('pending state', () => {
    it('returns pending state from useTopTokens', () => {
      (useTokensWithBalance as jest.Mock).mockReturnValue([]);

      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: [],
        remainingTokens: [],
        pending: true,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            topTokensChainId: ethChainId,
            balanceChainIds: [ethChainId],
          }),
        {
          state: initialState,
        },
      );

      expect(result.current.pending).toBe(true);
    });

    it('returns non-pending state when top tokens are loaded', () => {
      (useTokensWithBalance as jest.Mock).mockReturnValue([]);

      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: [],
        remainingTokens: [],
        pending: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            topTokensChainId: ethChainId,
            balanceChainIds: [ethChainId],
          }),
        {
          state: initialState,
        },
      );

      expect(result.current.pending).toBe(false);
    });
  });

  describe('non-EVM chain ID handling', () => {
    it('normalizes non-EVM chain token addresses using formatAddressToAssetId', async () => {
      const solanaChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const solanaToken = {
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        symbol: 'BONK',
        name: 'Bonk',
        decimals: 5,
        chainId: solanaChainId,
        balance: '1000000',
        balanceFiat: '$50',
        tokenFiatAmount: 50,
      };

      (isNonEvmChainId as jest.Mock).mockImplementation((chainId: string) =>
        chainId.startsWith('solana:'),
      );
      (formatAddressToAssetId as jest.Mock).mockReturnValue(
        'solana:DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      );

      (useTokensWithBalance as jest.Mock).mockReturnValue([solanaToken]);

      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: [],
        remainingTokens: [],
        pending: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            balanceChainIds: [solanaChainId],
          }),
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        expect(result.current.tokensToRender.length).toBe(1);
        expect(result.current.tokensToRender[0].symbol).toBe('BONK');
        expect(formatAddressToAssetId).toHaveBeenCalledWith(
          solanaToken.address,
          solanaChainId,
        );
      });
    });

    it('throws error when normalized address is empty for non-EVM chain', async () => {
      const solanaChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const invalidToken = {
        address: 'invalid',
        symbol: 'BAD',
        name: 'Bad Token',
        decimals: 18,
        chainId: solanaChainId,
        balance: '0',
        balanceFiat: '$0',
        tokenFiatAmount: 0,
      };

      (isNonEvmChainId as jest.Mock).mockImplementation((chainId: string) =>
        chainId.startsWith('solana:'),
      );
      (formatAddressToAssetId as jest.Mock).mockReturnValue('');

      (useTokensWithBalance as jest.Mock).mockReturnValue([invalidToken]);

      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: [],
        remainingTokens: [],
        pending: false,
      });

      expect(() => {
        renderHookWithProvider(
          () =>
            useTokens({
              balanceChainIds: [solanaChainId],
            }),
          {
            state: initialState,
          },
        );
      }).toThrow(
        `Invalid token address: invalid for chain ID: ${solanaChainId}`,
      );
    });
  });

  describe('non-tradable token filtering', () => {
    it('filters out non-tradable Tron tokens from tokensWithBalance', async () => {
      const tronEnergyToken = {
        address: '0x123',
        symbol: 'Energy',
        name: 'Energy',
        decimals: 6,
        chainId: TrxScope.Mainnet,
        balance: '100',
        balanceFiat: '$0',
        tokenFiatAmount: 0,
      };

      const tronUSDT = {
        address: '0xabc',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        chainId: TrxScope.Mainnet,
        balance: '50',
        balanceFiat: '$50',
        tokenFiatAmount: 50,
      };

      (useTokensWithBalance as jest.Mock).mockReturnValue([
        tronEnergyToken,
        tronUSDT,
      ]);

      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: [],
        remainingTokens: [],
        pending: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            balanceChainIds: [TrxScope.Mainnet],
          }),
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        expect(result.current.allTokens.length).toBe(1);
        expect(result.current.tokensToRender.length).toBe(1);
        expect(result.current.tokensToRender[0].symbol).toBe('USDT');
      });
    });

    it('filters out non-tradable Tron tokens from topTokens', async () => {
      const tronBandwidthToken = {
        address: '0x456',
        symbol: 'Bandwidth',
        name: 'Bandwidth',
        decimals: 6,
        chainId: TrxScope.Mainnet,
      };

      const tronUSDC = {
        address: '0xdef',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        chainId: TrxScope.Mainnet,
      };

      (useTokensWithBalance as jest.Mock).mockReturnValue([]);

      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: [tronBandwidthToken, tronUSDC],
        remainingTokens: [],
        pending: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            topTokensChainId: TrxScope.Mainnet,
            balanceChainIds: [TrxScope.Mainnet],
          }),
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        expect(result.current.allTokens.length).toBe(1);
        expect(result.current.tokensToRender.length).toBe(1);
        expect(result.current.tokensToRender[0].symbol).toBe('USDC');
      });
    });

    it('filters out non-tradable Tron tokens from remainingTokens', async () => {
      const tronMaxBandwidthToken = {
        address: '0x789',
        symbol: 'Max-Bandwidth',
        name: 'Max Bandwidth',
        decimals: 6,
        chainId: TrxScope.Mainnet,
      };

      const tronDAI = {
        address: '0xghi',
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        chainId: TrxScope.Mainnet,
      };

      (useTokensWithBalance as jest.Mock).mockReturnValue([]);

      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: [],
        remainingTokens: [tronMaxBandwidthToken, tronDAI],
        pending: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            topTokensChainId: TrxScope.Mainnet,
            balanceChainIds: [TrxScope.Mainnet],
          }),
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        expect(result.current.allTokens.length).toBe(1);
        expect(result.current.allTokens[0].symbol).toBe('DAI');
      });
    });
  });

  describe('token deduplication and combination', () => {
    it('combines tokensWithBalance and remainingTokens without duplicates', async () => {
      const ethToken = {
        address: zeroAddress(),
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        chainId: ethChainId,
        balance: '1.0',
        balanceFiat: '$2000',
        tokenFiatAmount: 2000,
      };

      const daiToken = {
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Hex,
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        chainId: ethChainId,
        balance: '100.0',
        balanceFiat: '$100',
        tokenFiatAmount: 100,
      };

      const usdcTokenWithoutBalance = {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Hex,
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        chainId: ethChainId,
      };

      const linkTokenRemaining = {
        address: '0x514910771AF9Ca656af840dff83E8264EcF986CA' as Hex,
        symbol: 'LINK',
        name: 'ChainLink Token',
        decimals: 18,
        chainId: ethChainId,
      };

      (useTokensWithBalance as jest.Mock).mockReturnValue([ethToken, daiToken]);

      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: [usdcTokenWithoutBalance],
        remainingTokens: [linkTokenRemaining],
        pending: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            topTokensChainId: ethChainId,
            balanceChainIds: [ethChainId],
          }),
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        // allTokens should include all unique tokens
        expect(result.current.allTokens.length).toBe(4);

        // tokensToRender should include tokens with balance and topTokens only (not remainingTokens)
        expect(result.current.tokensToRender.length).toBe(3);

        const symbols = result.current.tokensToRender.map((t) => t.symbol);
        expect(symbols).toContain('ETH');
        expect(symbols).toContain('DAI');
        expect(symbols).toContain('USDC');
        expect(symbols).not.toContain('LINK');
      });
    });

    it('handles case when tokensToExclude is undefined', async () => {
      const ethToken = {
        address: zeroAddress(),
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        chainId: ethChainId,
        balance: '1.0',
        balanceFiat: '$2000',
        tokenFiatAmount: 2000,
      };

      (useTokensWithBalance as jest.Mock).mockReturnValue([ethToken]);

      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: [],
        remainingTokens: [],
        pending: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            topTokensChainId: ethChainId,
            balanceChainIds: [ethChainId],
            tokensToExclude: undefined,
          }),
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        expect(result.current.allTokens.length).toBe(1);
        expect(result.current.tokensToRender.length).toBe(1);
      });
    });

    it('excludes multiple tokens from different chains', async () => {
      const ethToken = {
        address: zeroAddress(),
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        chainId: ethChainId,
        balance: '1.0',
        balanceFiat: '$2000',
        tokenFiatAmount: 2000,
      };

      const polygonToken = {
        address: zeroAddress(),
        symbol: 'POL',
        name: 'Polygon',
        decimals: 18,
        chainId: polygonChainId,
        balance: '100.0',
        balanceFiat: '$155',
        tokenFiatAmount: 155,
      };

      (useTokensWithBalance as jest.Mock).mockReturnValue([
        ethToken,
        polygonToken,
      ]);

      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: [],
        remainingTokens: [],
        pending: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            balanceChainIds: [ethChainId, polygonChainId],
            tokensToExclude: [
              { address: zeroAddress(), chainId: ethChainId },
              { address: zeroAddress(), chainId: polygonChainId },
            ],
          }),
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        expect(result.current.allTokens.length).toBe(0);
        expect(result.current.tokensToRender.length).toBe(0);
      });
    });
  });

  describe('edge cases with null/undefined values', () => {
    it('handles null topTokens array', async () => {
      const ethToken = {
        address: zeroAddress(),
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        chainId: ethChainId,
        balance: '1.0',
        balanceFiat: '$2000',
        tokenFiatAmount: 2000,
      };

      (useTokensWithBalance as jest.Mock).mockReturnValue([ethToken]);

      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: null,
        remainingTokens: [],
        pending: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            topTokensChainId: ethChainId,
            balanceChainIds: [ethChainId],
          }),
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        expect(result.current.allTokens.length).toBe(1);
        expect(result.current.tokensToRender.length).toBe(1);
        expect(result.current.tokensToRender[0].symbol).toBe('ETH');
      });
    });

    it('handles null remainingTokens array', async () => {
      const ethToken = {
        address: zeroAddress(),
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        chainId: ethChainId,
        balance: '1.0',
        balanceFiat: '$2000',
        tokenFiatAmount: 2000,
      };

      (useTokensWithBalance as jest.Mock).mockReturnValue([ethToken]);

      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: [],
        remainingTokens: null,
        pending: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            topTokensChainId: ethChainId,
            balanceChainIds: [ethChainId],
          }),
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        expect(result.current.allTokens.length).toBe(1);
        expect(result.current.tokensToRender.length).toBe(1);
        expect(result.current.tokensToRender[0].symbol).toBe('ETH');
      });
    });

    it('handles both null topTokens and remainingTokens arrays', async () => {
      const ethToken = {
        address: zeroAddress(),
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        chainId: ethChainId,
        balance: '1.0',
        balanceFiat: '$2000',
        tokenFiatAmount: 2000,
      };

      (useTokensWithBalance as jest.Mock).mockReturnValue([ethToken]);

      (useTopTokens as jest.Mock).mockReturnValue({
        topTokens: null,
        remainingTokens: null,
        pending: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useTokens({
            topTokensChainId: ethChainId,
            balanceChainIds: [ethChainId],
          }),
        {
          state: initialState,
        },
      );

      await waitFor(() => {
        expect(result.current.allTokens.length).toBe(1);
        expect(result.current.tokensToRender.length).toBe(1);
        expect(result.current.tokensToRender[0].symbol).toBe('ETH');
      });
    });
  });
});
