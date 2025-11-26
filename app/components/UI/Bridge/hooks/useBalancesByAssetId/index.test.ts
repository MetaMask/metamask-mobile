import { renderHook } from '@testing-library/react-native';
import { Hex, CaipChainId } from '@metamask/utils';
import { useBalancesByAssetId } from './index';
import { useTokensWithBalance } from '../useTokensWithBalance';
import { BridgeToken } from '../../types';

// Mock useTokensWithBalance hook
jest.mock('../useTokensWithBalance', () => ({
  useTokensWithBalance: jest.fn(),
}));

// Mock formatAddressToAssetId from bridge-controller
jest.mock('@metamask/bridge-controller', () => ({
  formatAddressToAssetId: jest.fn(
    (address: string, chainId: string) => `${chainId}/erc20:${address}`,
  ),
}));

const mockUseTokensWithBalance = useTokensWithBalance as jest.Mock;

const createMockToken = (
  overrides: Partial<BridgeToken> = {},
): BridgeToken => ({
  address: '0x1234567890123456789012345678901234567890',
  symbol: 'TEST',
  decimals: 18,
  chainId: '0x1',
  name: 'Test Token',
  balance: '100.0',
  balanceFiat: '$100',
  tokenFiatAmount: 100,
  currencyExchangeRate: 1,
  ...overrides,
});

describe('useBalancesByAssetId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty balancesByAssetId when no tokens have balances', () => {
    mockUseTokensWithBalance.mockReturnValue([]);

    const { result } = renderHook(() =>
      useBalancesByAssetId({ chainIds: ['0x1' as Hex] }),
    );

    expect(result.current.balancesByAssetId).toEqual({});
    expect(result.current.tokensWithBalance).toEqual([]);
  });

  it('maps token balances to assetId keys', () => {
    const mockTokens = [
      createMockToken({
        address: '0xtoken1',
        chainId: '0x1',
        balance: '50.0',
        balanceFiat: '$50',
        tokenFiatAmount: 50,
        currencyExchangeRate: 1,
      }),
      createMockToken({
        address: '0xtoken2',
        chainId: '0x1',
        balance: '100.0',
        balanceFiat: '$100',
        tokenFiatAmount: 100,
        currencyExchangeRate: 1,
      }),
    ];
    mockUseTokensWithBalance.mockReturnValue(mockTokens);

    const { result } = renderHook(() =>
      useBalancesByAssetId({ chainIds: ['0x1' as Hex] }),
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

  it('excludes tokens without balance', () => {
    const mockTokens = [
      createMockToken({
        address: '0xwithbalance',
        chainId: '0x1',
        balance: '50.0',
      }),
      createMockToken({
        address: '0xnobalance',
        chainId: '0x1',
        balance: undefined,
      }),
    ];
    mockUseTokensWithBalance.mockReturnValue(mockTokens);

    const { result } = renderHook(() =>
      useBalancesByAssetId({ chainIds: ['0x1' as Hex] }),
    );

    expect(Object.keys(result.current.balancesByAssetId)).toHaveLength(1);
    expect(
      result.current.balancesByAssetId['0x1/erc20:0xwithbalance'],
    ).toBeDefined();
    expect(
      result.current.balancesByAssetId['0x1/erc20:0xnobalance'],
    ).toBeUndefined();
  });

  it('returns tokensWithBalance array from useTokensWithBalance', () => {
    const mockTokens = [
      createMockToken({ address: '0xtoken1' }),
      createMockToken({ address: '0xtoken2' }),
    ];
    mockUseTokensWithBalance.mockReturnValue(mockTokens);

    const { result } = renderHook(() =>
      useBalancesByAssetId({ chainIds: ['0x1' as Hex] }),
    );

    expect(result.current.tokensWithBalance).toEqual(mockTokens);
  });

  it('handles multiple chain IDs', () => {
    const mockTokens = [
      createMockToken({
        address: '0xtoken1',
        chainId: '0x1',
        balance: '10.0',
      }),
      createMockToken({
        address: '0xtoken2',
        chainId: '0xa',
        balance: '20.0',
      }),
    ];
    mockUseTokensWithBalance.mockReturnValue(mockTokens);

    const { result } = renderHook(() =>
      useBalancesByAssetId({ chainIds: ['0x1' as Hex, '0xa' as Hex] }),
    );

    expect(
      result.current.balancesByAssetId['0x1/erc20:0xtoken1'],
    ).toBeDefined();
    expect(
      result.current.balancesByAssetId['0xa/erc20:0xtoken2'],
    ).toBeDefined();
  });

  it('handles CAIP chain IDs', () => {
    const mockTokens = [
      createMockToken({
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
      result.current.balancesByAssetId['eip155:1/erc20:0xtoken1'],
    ).toBeDefined();
  });

  it('passes chainIds to useTokensWithBalance', () => {
    mockUseTokensWithBalance.mockReturnValue([]);
    const chainIds = ['0x1' as Hex, '0xa' as Hex];

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
      createMockToken({
        address: '0xtoken1',
        chainId: '0x1',
        balance: '50.0',
        balanceFiat: undefined,
        tokenFiatAmount: undefined,
        currencyExchangeRate: undefined,
      }),
    ];
    mockUseTokensWithBalance.mockReturnValue(mockTokens);

    const { result } = renderHook(() =>
      useBalancesByAssetId({ chainIds: ['0x1' as Hex] }),
    );

    expect(result.current.balancesByAssetId['0x1/erc20:0xtoken1']).toEqual({
      balance: '50.0',
      balanceFiat: undefined,
      tokenFiatAmount: undefined,
      currencyExchangeRate: undefined,
    });
  });
});
