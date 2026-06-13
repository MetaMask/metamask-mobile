import { renderHook } from '@testing-library/react-hooks';
import { CaipChainId, Hex } from '@metamask/utils';

import { BridgeToken } from '../../types';
import { SUPPORTED_BATCH_SELL_CHAIN_IDS } from './BatchSellTokenSelect.utils';
import { useBatchSellTokens } from './useBatchSellTokens';

const mockUseTokensWithBalance = jest.fn();
let mockStablecoinsByChain: Partial<Record<CaipChainId, BridgeToken[]>> = {};

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  selectBatchSellDestStablecoinsByChain: jest.fn(() => mockStablecoinsByChain),
}));

jest.mock('../../hooks/useTokensWithBalance', () => ({
  useTokensWithBalance: (options?: { chainIds?: CaipChainId[] }) =>
    mockUseTokensWithBalance(options),
}));

const createToken = (overrides: Partial<BridgeToken>): BridgeToken => ({
  address: '0x1111111111111111111111111111111111111111',
  chainId: '0x1' as Hex,
  decimals: 18,
  name: 'Test Token',
  symbol: 'TEST',
  ...overrides,
});

describe('useBatchSellTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStablecoinsByChain = {};
    mockUseTokensWithBalance.mockReturnValue([]);
  });

  it('requests wallet tokens for supported Batch Sell chains', () => {
    renderHook(() => useBatchSellTokens());

    expect(mockUseTokensWithBalance).toHaveBeenCalledWith({
      chainIds: SUPPORTED_BATCH_SELL_CHAIN_IDS,
    });
  });

  it('returns unsorted wallet tokens excluding configured destination stablecoins', () => {
    const lowValueToken = createToken({
      address: '0x2222222222222222222222222222222222222222',
      symbol: 'LOW',
      tokenFiatAmount: 1,
    });
    const stablecoinToken = createToken({
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      symbol: 'USDC',
      tokenFiatAmount: 100,
    });
    const highValueToken = createToken({
      address: '0x3333333333333333333333333333333333333333',
      symbol: 'HIGH',
      tokenFiatAmount: 500,
    });

    mockUseTokensWithBalance.mockReturnValue([
      lowValueToken,
      stablecoinToken,
      highValueToken,
    ]);
    mockStablecoinsByChain = {
      'eip155:1': [stablecoinToken],
    };

    const { result } = renderHook(() => useBatchSellTokens());

    expect(result.current).toEqual([lowValueToken, highValueToken]);
  });

  it('excludes Ondo Tokenized tokens', () => {
    const sellableToken = createToken({
      address: '0x2222222222222222222222222222222222222222',
      name: 'Sellable Token',
      symbol: 'SELL',
    });
    const ondoTokenizedToken = createToken({
      address: '0x3333333333333333333333333333333333333333',
      name: 'Ondo Tokenized TSLA',
      symbol: 'TSLAon',
    });

    mockUseTokensWithBalance.mockReturnValue([
      sellableToken,
      ondoTokenizedToken,
    ]);

    const { result } = renderHook(() => useBatchSellTokens());

    expect(result.current).toEqual([sellableToken]);
  });

  it('excludes tokens with rwaData', () => {
    const sellableToken = createToken({
      address: '0x2222222222222222222222222222222222222222',
      symbol: 'SELL',
    });
    const rwaToken = createToken({
      address: '0x3333333333333333333333333333333333333333',
      symbol: 'AAPL',
      rwaData: {
        instrumentType: 'stock',
      },
    });

    mockUseTokensWithBalance.mockReturnValue([sellableToken, rwaToken]);

    const { result } = renderHook(() => useBatchSellTokens());

    expect(result.current).toEqual([sellableToken]);
  });
});
