import { renderHook } from '@testing-library/react-native';
import { useReceiveTokens } from './useReceiveTokens';
import { enrichTokenBalance } from './enrichTokenBalance';
import { useNetworkEnabledPredicate } from './useNetworkEnabledPredicate';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => undefined),
}));

jest.mock('./useNetworkEnabledPredicate', () => ({
  useNetworkEnabledPredicate: jest.fn(),
}));

jest.mock(
  '../../../../../../UI/Bridge/constants/default-swap-dest-tokens',
  () => ({
    DefaultSwapDestTokens: {
      'eip155:1/erc20:musd': {
        symbol: 'mUSD',
        address: '0xmusd',
        chainId: '0x1',
        decimals: 6,
        name: 'MetaMask USD',
      },
      'eip155:137/erc20:usdc_matic': {
        symbol: 'USDC',
        address: '0xusdc_matic',
        chainId: '0x89',
        decimals: 6,
        name: 'USD Coin (Polygon)',
      },
      'eip155:1/erc20:weth': {
        symbol: 'WETH',
        address: '0xweth',
        chainId: '0x1',
        decimals: 18,
        name: 'Wrapped Ether',
      },
    },
    Bip44TokensForDefaultPairs: {
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
        symbol: 'USDC',
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '0x1',
        decimals: 6,
        name: 'USD Coin',
      },
    },
  }),
);

jest.mock('../../../../../../../constants/bridge', () => ({
  ETH_USDT_ADDRESS: '0xdac17f958d2ee523a2206206994597c13d831ec7',
}));

jest.mock('./enrichTokenBalance', () => ({
  enrichTokenBalance: jest.fn(),
}));

const mockEnrich = enrichTokenBalance as jest.Mock;
const mockUseNetworkEnabledPredicate = useNetworkEnabledPredicate as jest.Mock;

describe('useReceiveTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNetworkEnabledPredicate.mockReturnValue(() => true);
    mockEnrich.mockReturnValue({
      balance: '0',
      balanceFiat: '$0.00',
      tokenFiatAmount: 0,
      currencyExchangeRate: 1,
    });
  });

  it('returns only stablecoin candidates (filters out non-stables like WETH)', () => {
    const { result } = renderHook(() => useReceiveTokens(undefined));

    const symbols = result.current.map((t) => t.symbol);
    expect(symbols).toContain('mUSD');
    expect(symbols).toContain('USDC');
    expect(symbols).toContain('USDT');
    expect(symbols).not.toContain('WETH');
  });

  it('sorts candidates on the preferred chain to the front', () => {
    const { result } = renderHook(() => useReceiveTokens('0x89'));

    expect(result.current[0].chainId).toBe('0x89');
  });

  it('enriches every candidate leniently (include zero balances with the stable fallback rate)', () => {
    renderHook(() => useReceiveTokens('0x1'));

    expect(mockEnrich).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: expect.any(String) }),
      expect.any(Object),
      { fallbackExchangeRate: 1.0, includeZeroBalance: true },
    );
  });

  it('drops candidates on networks the user has not enabled', () => {
    mockUseNetworkEnabledPredicate.mockReturnValue(
      (chainId: string | undefined) => chainId === '0x1',
    );

    const { result } = renderHook(() => useReceiveTokens(undefined));

    const chainIds = result.current.map((t) => t.chainId);
    expect(chainIds).toContain('0x1');
    expect(chainIds).not.toContain('0x89');
  });
});
