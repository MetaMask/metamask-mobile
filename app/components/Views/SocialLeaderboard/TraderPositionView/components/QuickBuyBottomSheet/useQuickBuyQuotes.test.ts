import { renderHook, act, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import { useQuickBuyQuotes } from './useQuickBuyQuotes';
import { QUICKBUY_FEATURE_ID } from './constants';
import type { BridgeToken } from '../../../../../UI/Bridge/types';

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: {
        fetchQuotes: jest.fn(),
      },
    },
  },
}));

// Keep helpers from the real module so type re-exports still load, but stub
// the functions we actually call so behaviour is deterministic.
jest.mock('@metamask/bridge-controller', () => {
  const actual = jest.requireActual('@metamask/bridge-controller');
  return {
    ...actual,
    formatAddressToCaipReference: jest.fn(
      (address: string) => `caip:${address}`,
    ),
    isNonEvmChainId: jest.fn(
      (chainId: string | undefined) =>
        typeof chainId === 'string' && chainId.startsWith('solana'),
    ),
  };
});

jest.mock('../../../../../../util/networks', () => ({
  getDecimalChainId: jest.fn((chainId: string) => chainId),
}));

jest.mock('../../../../../../util/transactions', () => ({
  // Minimal stand-in: multiplies readable by 10^decimals and formats as a
  // whole-number string — the same contract the hook relies on.
  calcTokenValue: jest.fn((amount: string, decimals: number) => ({
    toFixed: () =>
      (BigInt(Math.floor(Number(amount) * 1e6)) * 10n ** BigInt(decimals - 6))
        .toString()
        .replace(/n$/, ''),
  })),
}));

jest.mock('../../../../../../util/number', () => ({
  fromTokenMinimalUnit: jest.fn(
    (atomic: string, decimals: number) => `${Number(atomic) / 10 ** decimals}`,
  ),
}));

jest.mock('../../../../../../util/address', () => ({
  areAddressesEqual: jest.fn(
    (a: string | undefined, b: string | undefined) => a === b,
  ),
}));

const mockFetchQuotes = Engine.context.BridgeController
  .fetchQuotes as jest.Mock;

const ETH_TOKEN: BridgeToken = {
  address: '0xETH',
  chainId: '0x1',
  decimals: 18,
  symbol: 'ETH',
  name: 'Ethereum',
  image: '',
  balance: '1.0',
  string: '1.0',
} as unknown as BridgeToken;

const DEST_TOKEN: BridgeToken = {
  address: '0xDEST',
  chainId: '0x1',
  decimals: 6,
  symbol: 'DEST',
  name: 'Destination Token',
  image: '',
  balance: '0',
  string: '0',
} as unknown as BridgeToken;

const buildRawQuote = (overrides: Record<string, unknown> = {}) => ({
  quote: {
    srcAsset: { address: ETH_TOKEN.address, assetId: undefined },
    destAsset: { address: DEST_TOKEN.address, assetId: undefined },
    destTokenAmount: '1000000', // 1 DEST (6 decimals)
    srcTokenAmount: '10000000000000000',
    srcChainId: 1,
    destChainId: 1,
    ...((overrides.quote as Record<string, unknown>) ?? {}),
  },
  trade: {},
  ...overrides,
});

const baseParams = {
  sourceToken: ETH_TOKEN,
  destToken: DEST_TOKEN,
  sourceTokenAmount: '0.01',
  slippage: '0.5',
  walletAddress: '0xWALLET',
  destAddress: '0xWALLET',
  insufficientBal: false,
  gasIncluded: false,
  gasIncluded7702: false,
  enabled: true,
};

describe('useQuickBuyQuotes', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts idle (no quotes, not loading) until inputs are valid', () => {
    const { result } = renderHook(() =>
      useQuickBuyQuotes({ ...baseParams, enabled: false }),
    );

    expect(result.current.activeQuote).toBeUndefined();
    expect(result.current.isQuoteLoading).toBe(false);
    expect(result.current.quoteFetchError).toBeNull();
    expect(result.current.isNoQuotesAvailable).toBe(false);
    expect(mockFetchQuotes).not.toHaveBeenCalled();
  });

  it('calls BridgeController.fetchQuotes after the debounce with the expected params', async () => {
    mockFetchQuotes.mockResolvedValue([buildRawQuote()]);

    renderHook(() => useQuickBuyQuotes(baseParams));

    // Not called immediately (debounced).
    expect(mockFetchQuotes).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(mockFetchQuotes).toHaveBeenCalledTimes(1);
    const [quoteRequest, abortSignal, featureId] =
      mockFetchQuotes.mock.calls[0];
    expect(quoteRequest).toMatchObject({
      walletAddress: '0xWALLET',
      destWalletAddress: '0xWALLET',
      slippage: 0.5,
      gasIncluded: false,
      gasIncluded7702: false,
      insufficientBal: false,
    });
    expect(abortSignal).toBeInstanceOf(AbortSignal);
    expect(featureId).toBe(QUICKBUY_FEATURE_ID);
  });

  it('exposes the first returned quote as the active quote and derives destTokenAmount', async () => {
    mockFetchQuotes.mockResolvedValue([buildRawQuote()]);

    const { result } = renderHook(() => useQuickBuyQuotes(baseParams));

    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => {
      expect(result.current.isQuoteLoading).toBe(false);
    });

    expect(result.current.activeQuote).toBeDefined();
    expect(result.current.destTokenAmount).toBe('1'); // 1000000 / 10^6
    expect(result.current.isActiveQuoteForCurrentTokenPair).toBe(true);
  });

  it('reports isNoQuotesAvailable when the backend returns an empty array', async () => {
    mockFetchQuotes.mockResolvedValue([]);

    const { result } = renderHook(() => useQuickBuyQuotes(baseParams));

    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => {
      expect(result.current.isQuoteLoading).toBe(false);
    });

    expect(result.current.isNoQuotesAvailable).toBe(true);
    expect(result.current.activeQuote).toBeUndefined();
  });

  it('surfaces quoteFetchError when fetchQuotes rejects', async () => {
    mockFetchQuotes.mockRejectedValue(new Error('network blew up'));
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const { result } = renderHook(() => useQuickBuyQuotes(baseParams));

    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => {
      expect(result.current.isQuoteLoading).toBe(false);
    });

    expect(result.current.quoteFetchError).toBe('network blew up');
    expect(result.current.activeQuote).toBeUndefined();
    consoleErrorSpy.mockRestore();
  });

  it('blockaidError is null (Blockaid validation is intentionally skipped)', async () => {
    mockFetchQuotes.mockResolvedValue([buildRawQuote()]);

    const { result } = renderHook(() => useQuickBuyQuotes(baseParams));

    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => {
      expect(result.current.isQuoteLoading).toBe(false);
    });

    expect(result.current.blockaidError).toBeNull();
  });

  it('re-fetches when input params change', async () => {
    mockFetchQuotes.mockResolvedValue([buildRawQuote()]);

    const { rerender } = renderHook(
      (props: typeof baseParams) => useQuickBuyQuotes(props),
      { initialProps: baseParams },
    );

    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(mockFetchQuotes).toHaveBeenCalledTimes(1);

    rerender({ ...baseParams, sourceTokenAmount: '0.02' });

    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(mockFetchQuotes).toHaveBeenCalledTimes(2);
  });

  it('clears state and does not fetch when disabled', async () => {
    mockFetchQuotes.mockResolvedValue([buildRawQuote()]);

    const { result, rerender } = renderHook(
      (props: typeof baseParams) => useQuickBuyQuotes(props),
      { initialProps: baseParams },
    );

    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => {
      expect(result.current.activeQuote).toBeDefined();
    });

    rerender({ ...baseParams, enabled: false });

    expect(result.current.activeQuote).toBeUndefined();
    expect(result.current.isQuoteLoading).toBe(false);
  });
});
