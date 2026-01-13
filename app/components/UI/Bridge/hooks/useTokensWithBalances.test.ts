import { renderHook } from '@testing-library/react-native';
import { CaipAssetType, CaipChainId } from '@metamask/utils';
import { constants } from 'ethers';
import { BtcAccountType } from '@metamask/keyring-api';
import { useTokensWithBalances } from './useTokensWithBalances';
import {
  createMockPopularToken,
  createMockBalanceData,
  MOCK_CHAIN_IDS,
} from '../testUtils/fixtures';
import { BalancesByAssetId } from './useBalancesByAssetId';

describe('useTokensWithBalances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('token conversion', () => {
    it.each([
      [
        'EVM ERC20 token',
        createMockPopularToken({
          assetId:
            'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType,
          chainId: MOCK_CHAIN_IDS.ethereum,
        }),
        {
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          chainId: '0x1',
        },
      ],
      [
        'EVM native token',
        createMockPopularToken({
          assetId: 'eip155:1/slip44:60' as CaipAssetType,
          chainId: MOCK_CHAIN_IDS.ethereum,
          symbol: 'ETH',
        }),
        { address: constants.AddressZero, chainId: '0x1' },
      ],
      [
        'non-EVM token',
        createMockPopularToken({
          assetId:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as CaipAssetType,
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
          symbol: 'USDC',
        }),
        {
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
      ],
    ])(
      'converts %s with correct address and chainId',
      (_, mockToken, expected) => {
        const { result } = renderHook(() =>
          useTokensWithBalances([mockToken], {}),
        );

        expect(result.current[0]).toMatchObject(expected);
      },
    );

    it('converts multiple chains to correct hex format', () => {
      const tokens = [
        createMockPopularToken({
          assetId:
            'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174' as CaipAssetType,
          chainId: MOCK_CHAIN_IDS.polygon,
          symbol: 'USDC',
        }),
        createMockPopularToken({
          assetId:
            'eip155:10/erc20:0x7f5c764cbc14f9669b88837ca1490cca17c31607' as CaipAssetType,
          chainId: MOCK_CHAIN_IDS.optimism,
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
      const balancesByAssetId: BalancesByAssetId = { [assetId]: balanceData };

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

      const tokens = [
        createMockPopularToken({ assetId: token1AssetId, symbol: 'TKN1' }),
        createMockPopularToken({ assetId: token2AssetId, symbol: 'TKN2' }),
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

  describe('noFee property', () => {
    it('preserves noFee property from API token', () => {
      const mockToken = createMockPopularToken({
        noFee: { isSource: true, isDestination: false },
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

  describe('accountType property', () => {
    it('merges accountType from balance data when available', () => {
      const assetId =
        'bip122:000000000019d6689c085ae165831e93/slip44:0' as CaipAssetType;
      const mockToken = createMockPopularToken({ assetId, symbol: 'BTC' });
      const balanceData = createMockBalanceData({
        balance: '0.5',
        balanceFiat: '$15000',
        accountType: BtcAccountType.P2wpkh,
      });
      const balancesByAssetId: BalancesByAssetId = { [assetId]: balanceData };

      const { result } = renderHook(() =>
        useTokensWithBalances([mockToken], balancesByAssetId),
      );

      expect(result.current[0].accountType).toBe(BtcAccountType.P2wpkh);
    });

    it('returns undefined accountType when balance data does not include it', () => {
      const assetId =
        'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;
      const mockToken = createMockPopularToken({ assetId });
      const balanceData = createMockBalanceData({
        balance: '500.0',
        accountType: undefined,
      });
      const balancesByAssetId: BalancesByAssetId = { [assetId]: balanceData };

      const { result } = renderHook(() =>
        useTokensWithBalances([mockToken], balancesByAssetId),
      );

      expect(result.current[0].accountType).toBeUndefined();
    });

    it('returns undefined accountType when no balance data exists', () => {
      const mockToken = createMockPopularToken({
        symbol: 'TEST',
      });

      const { result } = renderHook(() =>
        useTokensWithBalances([mockToken], {}),
      );

      expect(result.current[0].accountType).toBeUndefined();
    });
  });
});
