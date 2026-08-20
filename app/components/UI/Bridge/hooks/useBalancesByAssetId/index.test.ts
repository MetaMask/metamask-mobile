import { renderHook } from '@testing-library/react-native';
import { Hex, CaipChainId, CaipAssetType } from '@metamask/utils';
import { BtcAccountType } from '@metamask/keyring-api';
import { useBalancesByAssetId } from './index';
import { useTokensWithBalance } from '../useTokensWithBalance';
import {
  createMockTokenWithBalance,
  MOCK_CHAIN_IDS_HEX,
} from '../../testUtils/fixtures';

jest.mock('../useTokensWithBalance', () => ({
  useTokensWithBalance: jest.fn(),
}));

const mockUseTokensWithBalance = useTokensWithBalance as jest.Mock;

describe('useBalancesByAssetId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('returns empty balancesByAssetId when no tokens have balances', () => {
      mockUseTokensWithBalance.mockReturnValue([]);

      const { result } = renderHook(() =>
        useBalancesByAssetId({
          chainIds: [MOCK_CHAIN_IDS_HEX.ethereum as Hex],
        }),
      );

      expect(result.current.balancesByAssetId).toEqual({});
      expect(result.current.tokensWithBalance).toEqual([]);
    });

    it('maps token balances to assetId keys', () => {
      const mockTokens = [
        createMockTokenWithBalance({
          address: '0x1111111111111111111111111111111111111111',
          balance: '50.0',
          balanceFiat: '$50',
          tokenFiatAmount: 50,
        }),
        createMockTokenWithBalance({
          address: '0x2222222222222222222222222222222222222222',
          balance: '100.0',
          balanceFiat: '$100',
          tokenFiatAmount: 100,
        }),
      ];
      mockUseTokensWithBalance.mockReturnValue(mockTokens);

      const { result } = renderHook(() =>
        useBalancesByAssetId({
          chainIds: [MOCK_CHAIN_IDS_HEX.ethereum as Hex],
        }),
      );

      expect(result.current.balancesByAssetId).toEqual({
        'eip155:1/erc20:0x1111111111111111111111111111111111111111': {
          balance: '50.0',
          balanceFiat: '$50',
          tokenFiatAmount: 50,
          currencyExchangeRate: 1,
        },
        'eip155:1/erc20:0x2222222222222222222222222222222222222222': {
          balance: '100.0',
          balanceFiat: '$100',
          tokenFiatAmount: 100,
          currencyExchangeRate: 1,
        },
      });
    });

    it('maps EVM token balances to canonical and lowercase assetId keys', () => {
      const mockTokens = [
        createMockTokenWithBalance({
          address: '0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
          balance: '50.0',
          balanceFiat: '$50',
        }),
      ];
      mockUseTokensWithBalance.mockReturnValue(mockTokens);

      const { result } = renderHook(() =>
        useBalancesByAssetId({
          chainIds: [MOCK_CHAIN_IDS_HEX.ethereum as Hex],
        }),
      );

      expect(
        result.current.balancesByAssetId[
          'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as CaipAssetType
        ],
      ).toEqual(
        expect.objectContaining({
          balance: '50.0',
          balanceFiat: '$50',
        }),
      );
      expect(
        result.current.balancesByAssetId[
          'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType
        ],
      ).toEqual(
        expect.objectContaining({
          balance: '50.0',
          balanceFiat: '$50',
        }),
      );
    });

    it('maps non-EVM token balances to a single assetId key', () => {
      const mockTokens = [
        createMockTokenWithBalance({
          address: 'SoLTokenABC',
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
          balance: '50.0',
          balanceFiat: '$50',
        }),
      ];
      mockUseTokensWithBalance.mockReturnValue(mockTokens);

      const { result } = renderHook(() =>
        useBalancesByAssetId({
          chainIds: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId],
        }),
      );

      expect(Object.keys(result.current.balancesByAssetId)).toHaveLength(1);
      expect(
        result.current.balancesByAssetId[
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:SoLTokenABC' as CaipAssetType
        ],
      ).toEqual(
        expect.objectContaining({
          balance: '50.0',
          balanceFiat: '$50',
        }),
      );
    });

    it('returns tokensWithBalance array from useTokensWithBalance', () => {
      const mockTokens = [
        createMockTokenWithBalance({ address: '0xtoken1' }),
        createMockTokenWithBalance({ address: '0xtoken2' }),
      ];
      mockUseTokensWithBalance.mockReturnValue(mockTokens);

      const { result } = renderHook(() =>
        useBalancesByAssetId({
          chainIds: [MOCK_CHAIN_IDS_HEX.ethereum as Hex],
        }),
      );

      expect(result.current.tokensWithBalance).toEqual(mockTokens);
    });
  });

  describe('filtering', () => {
    it('excludes tokens without balance', () => {
      const mockTokens = [
        createMockTokenWithBalance({
          address: '0x3333333333333333333333333333333333333333',
          balance: '50.0',
        }),
        createMockTokenWithBalance({
          address: '0x4444444444444444444444444444444444444444',
          balance: undefined,
        }),
      ];
      mockUseTokensWithBalance.mockReturnValue(mockTokens);

      const { result } = renderHook(() =>
        useBalancesByAssetId({
          chainIds: [MOCK_CHAIN_IDS_HEX.ethereum as Hex],
        }),
      );

      expect(Object.keys(result.current.balancesByAssetId)).toHaveLength(1);
      expect(
        result.current.balancesByAssetId[
          'eip155:1/erc20:0x3333333333333333333333333333333333333333' as CaipAssetType
        ],
      ).toBeDefined();
      expect(
        result.current.balancesByAssetId[
          'eip155:1/erc20:0x4444444444444444444444444444444444444444' as CaipAssetType
        ],
      ).toBeUndefined();
    });
  });

  describe('multi-chain support', () => {
    it('handles multiple chain IDs', () => {
      const mockTokens = [
        createMockTokenWithBalance({
          address: '0x1111111111111111111111111111111111111111',
          chainId: MOCK_CHAIN_IDS_HEX.ethereum as Hex,
          balance: '10.0',
        }),
        createMockTokenWithBalance({
          address: '0x2222222222222222222222222222222222222222',
          chainId: '0xa' as Hex,
          balance: '20.0',
        }),
      ];
      mockUseTokensWithBalance.mockReturnValue(mockTokens);

      const { result } = renderHook(() =>
        useBalancesByAssetId({
          chainIds: [MOCK_CHAIN_IDS_HEX.ethereum as Hex, '0xa' as Hex],
        }),
      );

      expect(
        result.current.balancesByAssetId[
          'eip155:1/erc20:0x1111111111111111111111111111111111111111' as CaipAssetType
        ],
      ).toBeDefined();
      expect(
        result.current.balancesByAssetId[
          'eip155:10/erc20:0x2222222222222222222222222222222222222222' as CaipAssetType
        ],
      ).toBeDefined();
    });

    it('handles CAIP chain IDs', () => {
      const mockTokens = [
        createMockTokenWithBalance({
          address: '0x1111111111111111111111111111111111111111',
          chainId: 'eip155:1' as CaipChainId,
          balance: '100.0',
        }),
      ];
      mockUseTokensWithBalance.mockReturnValue(mockTokens);

      const { result } = renderHook(() =>
        useBalancesByAssetId({ chainIds: ['eip155:1' as CaipChainId] }),
      );

      expect(
        result.current.balancesByAssetId[
          'eip155:1/erc20:0x1111111111111111111111111111111111111111' as CaipAssetType
        ],
      ).toBeDefined();
    });
  });

  describe('parameter handling', () => {
    it('passes chainIds to useTokensWithBalance', () => {
      mockUseTokensWithBalance.mockReturnValue([]);
      const chainIds = [MOCK_CHAIN_IDS_HEX.ethereum as Hex, '0xa' as Hex];

      renderHook(() => useBalancesByAssetId({ chainIds }));

      expect(mockUseTokensWithBalance).toHaveBeenCalledWith({ chainIds });
    });

    it('handles undefined chainIds', () => {
      mockUseTokensWithBalance.mockReturnValue([]);

      const { result } = renderHook(() =>
        useBalancesByAssetId({ chainIds: undefined }),
      );

      expect(result.current.balancesByAssetId).toEqual({});
      expect(mockUseTokensWithBalance).toHaveBeenCalledWith({
        chainIds: undefined,
      });
    });

    it('preserves optional balance properties', () => {
      const mockTokens = [
        createMockTokenWithBalance({
          address: '0x5555555555555555555555555555555555555555',
          balance: '50.0',
          balanceFiat: undefined,
          tokenFiatAmount: undefined,
          currencyExchangeRate: undefined,
        }),
      ];
      mockUseTokensWithBalance.mockReturnValue(mockTokens);

      const { result } = renderHook(() =>
        useBalancesByAssetId({
          chainIds: [MOCK_CHAIN_IDS_HEX.ethereum as Hex],
        }),
      );

      expect(
        result.current.balancesByAssetId[
          'eip155:1/erc20:0x5555555555555555555555555555555555555555' as CaipAssetType
        ],
      ).toEqual({
        balance: '50.0',
        balanceFiat: undefined,
        tokenFiatAmount: undefined,
        currencyExchangeRate: undefined,
        accountType: undefined,
      });
    });

    it('includes accountType when token has accountType', () => {
      const mockTokens = [
        createMockTokenWithBalance({
          address: '0x6666666666666666666666666666666666666666',
          balance: '1.5',
          balanceFiat: '$45000',
          tokenFiatAmount: 45000,
          accountType: BtcAccountType.P2wpkh,
        }),
      ];
      mockUseTokensWithBalance.mockReturnValue(mockTokens);

      const { result } = renderHook(() =>
        useBalancesByAssetId({
          chainIds: [MOCK_CHAIN_IDS_HEX.ethereum as Hex],
        }),
      );

      expect(
        result.current.balancesByAssetId[
          'eip155:1/erc20:0x6666666666666666666666666666666666666666' as CaipAssetType
        ],
      ).toEqual({
        balance: '1.5',
        balanceFiat: '$45000',
        tokenFiatAmount: 45000,
        currencyExchangeRate: 1,
        accountType: BtcAccountType.P2wpkh,
      });
    });
  });
});
