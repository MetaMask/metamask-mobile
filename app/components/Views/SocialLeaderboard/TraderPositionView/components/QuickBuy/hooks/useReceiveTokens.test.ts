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

jest.mock(
  '../../../../../../UI/Bridge/utils/getAllChainDefaultDestTokens',
  () => ({
    getAllChainDefaultDestTokens: jest.fn(() => [
      {
        symbol: 'mUSD',
        address: '0xmusd',
        chainId: '0x1',
        decimals: 6,
        name: 'MetaMask USD',
      },
      {
        symbol: 'USDC',
        address: '0xusdc_matic',
        chainId: '0x89',
        decimals: 6,
        name: 'USD Coin (Polygon)',
      },
      {
        // Intentionally non-stablecoin to verify filtering
        symbol: 'WETH',
        address: '0xweth',
        chainId: '0x1',
        decimals: 18,
        name: 'Wrapped Ether',
      },
    ]),
  }),
);

jest.mock('../../../../../../../constants/bridge', () => ({
  ETH_USDT_ADDRESS: '0xdac17f958d2ee523a2206206994597c13d831ec7',
}));

jest.mock('./enrichTokenBalance', () => ({
  enrichTokenBalance: jest.fn(),
}));

jest.mock('../../../../../../UI/Bridge/utils/tokenUtils', () => ({
  getNativeSourceToken: jest.fn((chainId: string) => {
    if (chainId === '0x1') {
      return {
        symbol: 'ETH',
        name: 'Ethereum',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        chainId: '0x1',
      };
    }
    if (chainId === '0x89') {
      return {
        symbol: 'POL',
        name: 'Polygon',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        chainId: '0x89',
      };
    }
    throw new Error(`unsupported chain ${chainId}`);
  }),
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

  it('returns stablecoin and native candidates (filters out non-stable non-native tokens like WETH)', () => {
    const { result } = renderHook(() => useReceiveTokens(undefined));

    const symbols = result.current.map((t) => t.symbol);
    expect(symbols).toContain('mUSD');
    expect(symbols).toContain('USDC');
    expect(symbols).toContain('USDT');
    expect(symbols).toContain('ETH');
    expect(symbols).toContain('POL');
    expect(symbols).not.toContain('WETH');
  });

  it('includes one native token per supported chain using the zero address', () => {
    const { result } = renderHook(() => useReceiveTokens(undefined));

    const natives = result.current.filter(
      (t) => t.symbol === 'ETH' || t.symbol === 'POL',
    );
    expect(natives).toHaveLength(2);
    natives.forEach((token) => {
      expect(token.address).toBe('0x0000000000000000000000000000000000000000');
    });
  });

  it('sorts candidates on the preferred chain to the front', () => {
    const { result } = renderHook(() => useReceiveTokens('0x89'));

    expect(result.current[0].chainId).toBe('0x89');
  });

  it('keeps a stablecoin first within the preferred chain group', () => {
    const { result } = renderHook(() => useReceiveTokens('0x89'));

    expect(result.current[0].symbol).toBe('USDC');
    expect(result.current.map((t) => t.symbol)).toContain('POL');
  });

  it('enriches every candidate leniently (include zero balances)', () => {
    renderHook(() => useReceiveTokens('0x1'));

    expect(mockEnrich).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: expect.any(String) }),
      expect.any(Object),
      { includeZeroBalance: true },
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
