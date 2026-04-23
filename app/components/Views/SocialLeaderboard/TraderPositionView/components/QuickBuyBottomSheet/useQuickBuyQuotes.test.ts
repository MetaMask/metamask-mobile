import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import {
  useQuickBuyQuotes,
  QUICK_BUY_QUOTE_DEBOUNCE_MS,
} from './useQuickBuyQuotes';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import {
  selectDestAddress,
  selectSlippage,
} from '../../../../../../core/redux/slices/bridge';
import {
  selectGasIncludedQuoteParams,
  selectSourceWalletAddress,
} from '../../../../../../selectors/bridge';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  shallowEqual: jest.fn(),
}));

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

jest.mock('../../../../../../util/analytics/analytics', () => ({
  analytics: {
    isEnabled: jest.fn(() => false),
  },
}));

jest.mock('../../../../../../selectors/featureFlagController', () => ({
  selectRemoteFeatureFlags: jest.fn(() => ({ bridgeConfig: {} })),
}));

jest.mock('../../../../../../core/redux/slices/bridge', () => ({
  selectDestAddress: jest.fn(),
  selectSlippage: jest.fn(),
}));

jest.mock('../../../../../../selectors/bridge', () => ({
  selectGasIncludedQuoteParams: jest.fn(),
  selectSourceWalletAddress: jest.fn(),
}));

const mockSelectBridgeQuotesBase = jest.fn();

jest.mock('@metamask/bridge-controller', () => {
  const actual = jest.requireActual('@metamask/bridge-controller');
  return {
    ...actual,
    selectBridgeQuotes: (...args: unknown[]) =>
      mockSelectBridgeQuotesBase(...args),
  };
});

const fetchQuotesMock = Engine.context.BridgeController
  .fetchQuotes as jest.Mock;
const useSelectorMock = useSelector as jest.Mock;

const createSourceToken = (overrides: Partial<BridgeToken> = {}): BridgeToken =>
  ({
    address: '0x0000000000000000000000000000000000000000',
    chainId: '0x1',
    decimals: 18,
    symbol: 'ETH',
    name: 'Ethereum',
    balance: '1.0',
    ...overrides,
  }) as BridgeToken;

const createDestToken = (overrides: Partial<BridgeToken> = {}): BridgeToken =>
  ({
    address: '0xDEST',
    chainId: '0x2105',
    decimals: 6,
    symbol: 'TEST',
    name: 'Test Token',
    balance: '0',
    ...overrides,
  }) as BridgeToken;

const createFetchedQuote = (overrides = {}) => ({
  quote: {
    requestId: 'quote-1',
    srcAsset: {
      address: '0x0000000000000000000000000000000000000000',
      chainId: 1,
      assetId: 'eip155:1/slip44:60',
      symbol: 'ETH',
      decimals: 18,
      name: 'Ethereum',
    },
    destAsset: {
      address: '0xDEST',
      chainId: 8453,
      assetId: 'eip155:8453/erc20:0xDEST',
      symbol: 'TEST',
      decimals: 6,
      name: 'Test',
    },
    srcChainId: 1,
    destChainId: 8453,
    srcTokenAmount: '10000000000000000',
    destTokenAmount: '5000000',
    minDestTokenAmount: '4950000',
  },
  estimatedProcessingTimeInSeconds: 30,
  ...overrides,
});

const mockRootState = {
  engine: {
    backgroundState: {
      BridgeController: { quotes: [] },
      GasFeeController: { gasFeeEstimatesByChainId: {} },
      MultichainAssetsRatesController: {},
      TokenRatesController: {},
      CurrencyRateController: {},
    },
  },
};

const setupSelectors = () => {
  (selectSlippage as unknown as jest.Mock).mockReturnValue('0.5');
  (selectDestAddress as unknown as jest.Mock).mockReturnValue(null);
  (selectSourceWalletAddress as unknown as jest.Mock).mockReturnValue(
    '0xWALLET',
  );
  (selectGasIncludedQuoteParams as unknown as jest.Mock).mockReturnValue({
    gasIncluded: false,
    gasIncluded7702: false,
  });

  useSelectorMock.mockImplementation((selector: (state: unknown) => unknown) =>
    selector(mockRootState),
  );
};

describe('useQuickBuyQuotes', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    setupSelectors();
    mockSelectBridgeQuotesBase.mockReturnValue({
      sortedQuotes: [],
      recommendedQuote: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns idle state when any required input is missing', () => {
    const { result } = renderHook(() =>
      useQuickBuyQuotes({
        sourceToken: undefined,
        destToken: createDestToken(),
        sourceTokenAmount: '0.001',
      }),
    );

    expect(result.current.activeQuote).toBeUndefined();
    expect(result.current.isQuoteLoading).toBe(false);
    expect(result.current.isNoQuotesAvailable).toBe(false);
    expect(fetchQuotesMock).not.toHaveBeenCalled();
  });

  it('debounces fetchQuotes calls', async () => {
    fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

    renderHook(() =>
      useQuickBuyQuotes({
        sourceToken: createSourceToken(),
        destToken: createDestToken(),
        sourceTokenAmount: '0.001',
      }),
    );

    expect(fetchQuotesMock).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
    });

    await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalledTimes(1));
  });

  it('calls BridgeController.fetchQuotes with atomic source amount and slippage', async () => {
    fetchQuotesMock.mockResolvedValue([createFetchedQuote()]);

    renderHook(() =>
      useQuickBuyQuotes({
        sourceToken: createSourceToken(),
        destToken: createDestToken(),
        sourceTokenAmount: '0.001',
      }),
    );

    act(() => {
      jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
    });

    await waitFor(() => expect(fetchQuotesMock).toHaveBeenCalled());

    const [request] = fetchQuotesMock.mock.calls[0];
    expect(request).toMatchObject({
      walletAddress: '0xWALLET',
      slippage: 0.5,
      srcTokenAmount: '1000000000000000',
      gasIncluded: false,
      gasIncluded7702: false,
    });
  });

  it('flags isNoQuotesAvailable when fetchQuotes returns an empty array', async () => {
    fetchQuotesMock.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useQuickBuyQuotes({
        sourceToken: createSourceToken(),
        destToken: createDestToken(),
        sourceTokenAmount: '0.001',
      }),
    );

    act(() => {
      jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
    });

    await waitFor(() => expect(result.current.isNoQuotesAvailable).toBe(true));
    expect(result.current.isQuoteLoading).toBe(false);
  });

  it('captures fetch errors in quoteFetchError', async () => {
    fetchQuotesMock.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() =>
      useQuickBuyQuotes({
        sourceToken: createSourceToken(),
        destToken: createDestToken(),
        sourceTokenAmount: '0.001',
      }),
    );

    act(() => {
      jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
    });

    await waitFor(() => expect(result.current.quoteFetchError).toBe('boom'));
    expect(result.current.isQuoteLoading).toBe(false);
  });

  it('skips fetching when the atomic source amount normalizes to zero', () => {
    renderHook(() =>
      useQuickBuyQuotes({
        sourceToken: createSourceToken({ decimals: 18 }),
        destToken: createDestToken(),
        sourceTokenAmount: '0',
      }),
    );

    act(() => {
      jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
    });

    expect(fetchQuotesMock).not.toHaveBeenCalled();
  });

  it('enriches raw quotes via selectBridgeQuotes and returns the recommended quote', async () => {
    const fetched = createFetchedQuote();
    const enriched = { ...fetched, gasFee: { effective: { amount: '0.001' } } };
    fetchQuotesMock.mockResolvedValue([fetched]);
    mockSelectBridgeQuotesBase.mockImplementation((controllerFields) =>
      controllerFields.quotes.length > 0
        ? { sortedQuotes: [enriched], recommendedQuote: enriched }
        : { sortedQuotes: [], recommendedQuote: null },
    );

    const { result } = renderHook(() =>
      useQuickBuyQuotes({
        sourceToken: createSourceToken(),
        destToken: createDestToken(),
        sourceTokenAmount: '0.001',
      }),
    );

    act(() => {
      jest.advanceTimersByTime(QUICK_BUY_QUOTE_DEBOUNCE_MS);
    });

    await waitFor(() => expect(result.current.activeQuote).toBe(enriched));
    expect(result.current.isActiveQuoteForCurrentTokenPair).toBe(true);
    expect(result.current.destTokenAmount).toBe('5');

    const lastCallFields = mockSelectBridgeQuotesBase.mock.calls.at(-1)?.[0];
    expect(lastCallFields.quotes).toEqual([fetched]);
  });
});
