import { renderHook } from '@testing-library/react-native';
import { useTokensWithBalance } from '../../../../../../UI/Bridge/hooks/useTokensWithBalance';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { enrichTokenBalance } from './enrichTokenBalance';
import { usePayWithTokens } from './usePayWithTokens';
import { useNetworkEnabledPredicate } from './useNetworkEnabledPredicate';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => undefined),
}));

jest.mock('../../../../../../UI/Bridge/hooks/useTokensWithBalance', () => ({
  useTokensWithBalance: jest.fn(),
}));

jest.mock('./enrichTokenBalance', () => ({
  enrichTokenBalance: jest.fn(),
}));

jest.mock('./useNetworkEnabledPredicate', () => ({
  useNetworkEnabledPredicate: jest.fn(),
}));

const mockUseTokensWithBalance = useTokensWithBalance as jest.Mock;
const mockEnrich = enrichTokenBalance as jest.Mock;
const mockUseNetworkEnabledPredicate = useNetworkEnabledPredicate as jest.Mock;

const token = (symbol: string, chainId = '0x1'): BridgeToken =>
  ({
    address: `0x${symbol.toLowerCase()}`,
    chainId,
    symbol,
    name: symbol,
    decimals: 18,
  }) as BridgeToken;

describe('usePayWithTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNetworkEnabledPredicate.mockReturnValue(() => true);
  });

  it('returns the held tokens enriched with priced balances', () => {
    mockUseTokensWithBalance.mockReturnValue([token('CAKE'), token('USDC')]);
    mockEnrich.mockImplementation((t: BridgeToken) => ({
      balance: '10',
      balanceFiat: '$10.00',
      tokenFiatAmount: t.symbol === 'CAKE' ? 30 : 10,
      currencyExchangeRate: 1,
    }));

    const { result } = renderHook(() => usePayWithTokens());

    expect(result.current.options.map((o) => o.symbol)).toEqual([
      'CAKE',
      'USDC',
    ]);
    expect(result.current.isLoading).toBe(false);
  });

  it('drops held tokens that cannot be priced', () => {
    mockUseTokensWithBalance.mockReturnValue([token('CAKE'), token('SCAM')]);
    mockEnrich.mockImplementation((t: BridgeToken) =>
      t.symbol === 'SCAM'
        ? null
        : {
            balance: '10',
            balanceFiat: '$10.00',
            tokenFiatAmount: 10,
            currencyExchangeRate: 1,
          },
    );

    const { result } = renderHook(() => usePayWithTokens());

    expect(result.current.options.map((o) => o.symbol)).toEqual(['CAKE']);
  });

  it('sorts options by fiat value descending', () => {
    mockUseTokensWithBalance.mockReturnValue([
      token('LOW'),
      token('HIGH'),
      token('MID'),
    ]);
    const fiatBySymbol: Record<string, number> = { LOW: 5, HIGH: 100, MID: 50 };
    mockEnrich.mockImplementation((t: BridgeToken) => ({
      balance: '1',
      balanceFiat: '$1.00',
      tokenFiatAmount: fiatBySymbol[t.symbol],
      currencyExchangeRate: 1,
    }));

    const { result } = renderHook(() => usePayWithTokens());

    expect(result.current.options.map((o) => o.symbol)).toEqual([
      'HIGH',
      'MID',
      'LOW',
    ]);
  });

  it('returns an empty list when the user holds no tokens', () => {
    mockUseTokensWithBalance.mockReturnValue([]);

    const { result } = renderHook(() => usePayWithTokens());

    expect(result.current.options).toEqual([]);
    expect(mockEnrich).not.toHaveBeenCalled();
  });

  it('drops held tokens on networks the user has not enabled', () => {
    mockUseTokensWithBalance.mockReturnValue([
      token('USDC', '0x1'),
      token('CAKE', '0x38'),
    ]);
    mockUseNetworkEnabledPredicate.mockReturnValue(
      (chainId: string | undefined) => chainId === '0x1',
    );
    mockEnrich.mockImplementation((t: BridgeToken) => ({
      balance: '10',
      balanceFiat: '$10.00',
      tokenFiatAmount: 10,
      currencyExchangeRate: 1,
    }));

    const { result } = renderHook(() => usePayWithTokens());

    expect(result.current.options.map((o) => o.symbol)).toEqual(['USDC']);
    expect(mockEnrich).not.toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'CAKE' }),
      expect.anything(),
    );
  });

  it('enriches held tokens without a price fallback', () => {
    mockUseTokensWithBalance.mockReturnValue([token('USDC'), token('CAKE')]);
    mockEnrich.mockReturnValue({
      balance: '10',
      balanceFiat: '$10.00',
      tokenFiatAmount: 10,
      currencyExchangeRate: 1,
    });

    renderHook(() => usePayWithTokens());

    expect(mockEnrich).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'USDC' }),
      expect.anything(),
    );
    expect(mockEnrich).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'CAKE' }),
      expect.anything(),
    );
  });
});
