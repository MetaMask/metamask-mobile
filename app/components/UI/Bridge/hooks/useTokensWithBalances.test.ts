import { renderHook } from '@testing-library/react-native';
import { CaipAssetType, CaipChainId } from '@metamask/utils';
import { constants } from 'ethers';
import { useTokensWithBalances } from './useTokensWithBalances';
import { PopularToken } from './usePopularTokens';
import { BalancesByAssetId, BalanceData } from './useBalancesByAssetId';

describe('useTokensWithBalances', () => {
  const createMockPopularToken = (
    overrides: Partial<PopularToken> = {},
  ): PopularToken => ({
    assetId:
      'eip155:1/erc20:0x1234567890123456789012345678901234567890' as CaipAssetType,
    chainId: 'eip155:1' as CaipChainId,
    decimals: 18,
    image: 'https://example.com/token.png',
    name: 'Test Token',
    symbol: 'TEST',
    ...overrides,
  });

  const createMockBalanceData = (
    overrides: Partial<BalanceData> = {},
  ): BalanceData => ({
    balance: '1.0',
    balanceFiat: '$100',
    tokenFiatAmount: 100,
    currencyExchangeRate: 100,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('token conversion', () => {
    it('converts EVM ERC20 token with correct address and chainId', () => {
      const mockToken = createMockPopularToken({
        assetId:
          'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType,
        chainId: 'eip155:1' as CaipChainId,
      });

      const { result } = renderHook(() =>
        useTokensWithBalances([mockToken], {}),
      );

      expect(result.current[0]).toMatchObject({
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '0x1',
      });
    });

    it('converts EVM native token with zero address', () => {
      const mockToken = createMockPopularToken({
        assetId: 'eip155:1/slip44:60' as CaipAssetType,
        chainId: 'eip155:1' as CaipChainId,
        symbol: 'ETH',
      });

      const { result } = renderHook(() =>
        useTokensWithBalances([mockToken], {}),
      );

      expect(result.current[0]).toMatchObject({
        address: constants.AddressZero,
        chainId: '0x1',
      });
    });

    it('keeps non-EVM token assetId as address', () => {
      const solanaAssetId =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as CaipAssetType;
      const mockToken = createMockPopularToken({
        assetId: solanaAssetId,
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
        symbol: 'USDC',
      });

      const { result } = renderHook(() =>
        useTokensWithBalances([mockToken], {}),
      );

      expect(result.current[0]).toMatchObject({
        address: solanaAssetId,
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      });
    });

    it('converts multiple chains to correct hex format', () => {
      const tokens: PopularToken[] = [
        createMockPopularToken({
          assetId:
            'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174' as CaipAssetType,
          chainId: 'eip155:137' as CaipChainId,
          symbol: 'USDC',
        }),
        createMockPopularToken({
          assetId:
            'eip155:10/erc20:0x7f5c764cbc14f9669b88837ca1490cca17c31607' as CaipAssetType,
          chainId: 'eip155:10' as CaipChainId,
          symbol: 'USDC',
        }),
      ];

      const { result } = renderHook(() => useTokensWithBalances(tokens, {}));

      expect(result.current[0].chainId).toBe('0x89');
      expect(result.current[1].chainId).toBe('0xa');
    });
  });

  describe('balance merging', () => {
    it('merges balance data when assetId matches', () => {
      const assetId =
        'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;
      const mockToken = createMockPopularToken({ assetId });
      const balanceData = createMockBalanceData({
        balance: '500.0',
        balanceFiat: '$500',
        tokenFiatAmount: 500,
        currencyExchangeRate: 1,
      });
      const balancesByAssetId: BalancesByAssetId = {
        [assetId]: balanceData,
      };

      const { result } = renderHook(() =>
        useTokensWithBalances([mockToken], balancesByAssetId),
      );

      expect(result.current[0]).toMatchObject({
        balance: '500.0',
        balanceFiat: '$500',
        tokenFiatAmount: 500,
        currencyExchangeRate: 1,
      });
    });

    it('preserves token properties when no balance data exists', () => {
      const mockToken = createMockPopularToken({
        name: 'Preserved Token',
        symbol: 'PRSV',
        decimals: 6,
      });

      const { result } = renderHook(() =>
        useTokensWithBalances([mockToken], {}),
      );

      expect(result.current[0]).toMatchObject({
        name: 'Preserved Token',
        symbol: 'PRSV',
        decimals: 6,
      });
      expect(result.current[0].balance).toBeUndefined();
      expect(result.current[0].balanceFiat).toBeUndefined();
    });

    it('handles empty token array', () => {
      const { result } = renderHook(() => useTokensWithBalances([], {}));

      expect(result.current).toEqual([]);
    });

    it('handles multiple tokens with partial balance data', () => {
      const token1AssetId =
        'eip155:1/erc20:0x1111111111111111111111111111111111111111' as CaipAssetType;
      const token2AssetId =
        'eip155:1/erc20:0x2222222222222222222222222222222222222222' as CaipAssetType;

      const tokens: PopularToken[] = [
        createMockPopularToken({
          assetId: token1AssetId,
          symbol: 'TKN1',
        }),
        createMockPopularToken({
          assetId: token2AssetId,
          symbol: 'TKN2',
        }),
      ];

      const balancesByAssetId: BalancesByAssetId = {
        [token1AssetId]: createMockBalanceData({ balance: '100.0' }),
      };

      const { result } = renderHook(() =>
        useTokensWithBalances(tokens, balancesByAssetId),
      );

      expect(result.current[0].balance).toBe('100.0');
      expect(result.current[1].balance).toBeUndefined();
    });
  });

  describe('noFee property preservation', () => {
    it('preserves noFee property from API token', () => {
      const mockToken = createMockPopularToken({
        noFee: {
          isSource: true,
          isDestination: false,
        },
      });

      const { result } = renderHook(() =>
        useTokensWithBalances([mockToken], {}),
      );

      expect(result.current[0].noFee).toEqual({
        isSource: true,
        isDestination: false,
      });
    });
  });
});
