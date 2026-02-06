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

jest.mock('@metamask/bridge-controller', () => ({
  formatAddressToAssetId: jest.fn(
    (address: string, chainId: string) => `${chainId}/erc20:${address}`,
  ),
  isNonEvmChainId: jest.fn((chainId: string) => !chainId.startsWith('0x')),
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
          address: '0xtoken1',
          balance: '50.0',
          balanceFiat: '$50',
          tokenFiatAmount: 50,
        }),
        createMockTokenWithBalance({
          address: '0xtoken2',
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
        '0x1/erc20:0xtoken1': {
          balance: '50.0',
          balanceFiat: '$50',
          tokenFiatAmount: 50,
          currencyExchangeRate: 1,
        },
        '0x1/erc20:0xtoken2': {
          balance: '100.0',
          balanceFiat: '$100',
          tokenFiatAmount: 100,
          currencyExchangeRate: 1,
        },
      });
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
          address: '0xwithbalance',
          balance: '50.0',
        }),
        createMockTokenWithBalance({
          address: '0xnobalance',
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
          '0x1/erc20:0xwithbalance' as CaipAssetType
        ],
      ).toBeDefined();
      expect(
        result.current.balancesByAssetId[
          '0x1/erc20:0xnobalance' as CaipAssetType
        ],
      ).toBeUndefined();
    });
  });

  describe('multi-chain support', () => {
    it('handles multiple chain IDs', () => {
      const mockTokens = [
        createMockTokenWithBalance({
          address: '0xtoken1',
          chainId: MOCK_CHAIN_IDS_HEX.ethereum as Hex,
          balance: '10.0',
        }),
        createMockTokenWithBalance({
          address: '0xtoken2',
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
        result.current.balancesByAssetId['0x1/erc20:0xtoken1' as CaipAssetType],
      ).toBeDefined();
      expect(
        result.current.balancesByAssetId['0xa/erc20:0xtoken2' as CaipAssetType],
      ).toBeDefined();
    });

    it('handles CAIP chain IDs', () => {
      const mockTokens = [
        createMockTokenWithBalance({
          address: '0xtoken1',
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
          'eip155:1/erc20:0xtoken1' as CaipAssetType
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
          address: '0xtoken1',
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
        result.current.balancesByAssetId['0x1/erc20:0xtoken1' as CaipAssetType],
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
          address: '0xbtctoken',
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
          '0x1/erc20:0xbtctoken' as CaipAssetType
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
