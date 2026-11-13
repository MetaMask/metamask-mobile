import { v4 as uuidv4 } from 'uuid';
import { QuoteStreamCompleteReason } from '@metamask/bridge-controller';
import {
  annotateTraceByRequest,
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { swapQuoteFetchTrace } from './swapQuoteFetchTrace';
import type { BridgeToken } from '../types';
import ReduxService from '../../../../core/redux';

let mockRemoteFeatureFlags: Record<string, unknown> = {};

jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
  annotateTraceByRequest: jest.fn(),
}));

let mockBridgeState: { quotes: unknown[]; quotesLastFetched: number | null };
let mockStoreListener: () => void;
const mockUnsubscribe = jest.fn();
jest.mock('../../../../core/redux', () => ({
  __esModule: true,
  default: {
    get store() {
      return {
        getState: () => ({
          engine: {
            backgroundState: {
              BridgeController: mockBridgeState,
              RemoteFeatureFlagController: {
                remoteFeatureFlags: mockRemoteFeatureFlags,
              },
            },
          },
        }),
        subscribe: (listener: () => void) => {
          mockStoreListener = listener;
          return mockUnsubscribe;
        },
      };
    },
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

const mockUuid = uuidv4 as jest.Mock<string>;
const mockTrace = trace as jest.MockedFunction<typeof trace>;
const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;

const sourceToken = { chainId: '0x1' } as unknown as BridgeToken;
const sameChainDestinationToken = { chainId: '0x1' } as unknown as BridgeToken;
const crossChainDestinationToken = {
  chainId: '0x89',
} as unknown as BridgeToken;

describe('swapQuoteFetchTrace', () => {
  beforeEach(() => {
    swapQuoteFetchTrace.finish('cancelled');
    jest.clearAllMocks();
    mockUuid.mockReturnValue('quote-trace-id');
    mockBridgeState = { quotes: [], quotesLastFetched: null };
    mockRemoteFeatureFlags = {};
  });

  it('starts a quote trace with request correlation and route data', () => {
    const traceId = swapQuoteFetchTrace.start({
      srcChainId: sourceToken.chainId,
      destChainId: crossChainDestinationToken.chainId,
      isRefresh: true,
    });

    expect(traceId).toBe('quote-trace-id');
    expect(mockTrace).toHaveBeenCalledWith({
      name: TraceName.SwapQuoteFetch,
      op: TraceOperation.BridgeDataFetch,
      id: 'quote-trace-id',
      data: {
        request_id: 'quote-trace-id',
        isRefresh: true,
        swap_type: 'crosschain',
        src_chain_id: 'eip155:1',
        dest_chain_id: 'eip155:137',
      },
      tags: {
        feature: 'swap',
      },
      startTime: expect.any(Number),
    });
  });

  it.each([
    [
      { swapsSWAPS5043AbtestFirstQuoteFlush: { name: 'treatment' } },
      'treatment',
    ],
    [{}, 'control'],
  ])(
    'annotates the trace with first_quote_flush_variant for flags %j',
    (flags, variant) => {
      mockRemoteFeatureFlags = flags;

      swapQuoteFetchTrace.start({ isRefresh: false });

      expect(annotateTraceByRequest).toHaveBeenCalledWith(
        { name: TraceName.SwapQuoteFetch, id: 'quote-trace-id' },
        { first_quote_flush_variant: variant },
      );
    },
  );

  it('ends the active quote trace with an explicit result', () => {
    swapQuoteFetchTrace.start({
      srcChainId: sourceToken.chainId,
      destChainId: sameChainDestinationToken.chainId,
      isRefresh: false,
    });

    swapQuoteFetchTrace.finish(
      'no_quotes',
      undefined,
      QuoteStreamCompleteReason.AMOUNT_TOO_LOW,
    );

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.SwapQuoteFetch,
      id: 'quote-trace-id',
      timestamp: expect.any(Number),
      data: { result: 'no_quotes', no_quote_reason: 'AMOUNT_TOO_LOW' },
    });
  });

  it('falls back to a generic reason for quote failures without a reason', () => {
    swapQuoteFetchTrace.start({
      srcChainId: sourceToken.chainId,
      destChainId: sameChainDestinationToken.chainId,
      isRefresh: false,
    });

    swapQuoteFetchTrace.finish('error');

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { result: 'error', no_quote_reason: 'generic_error' },
      }),
    );
  });

  it.each(['success', 'cancelled'] as const)(
    'does not attach a no-quote reason to %s traces',
    (result) => {
      swapQuoteFetchTrace.start({
        srcChainId: sourceToken.chainId,
        destChainId: sameChainDestinationToken.chainId,
        isRefresh: false,
      });

      swapQuoteFetchTrace.finish(
        result,
        undefined,
        QuoteStreamCompleteReason.RETRY,
      );

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({ data: { result } }),
      );
    },
  );

  it('records request sent and first quote in state from Redux, ignoring stale quotes', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
    mockBridgeState = { quotes: [{}], quotesLastFetched: 500 };
    swapQuoteFetchTrace.start({ isRefresh: false });
    jest.mocked(annotateTraceByRequest).mockClear();
    const span = { name: TraceName.SwapQuoteFetch, id: 'quote-trace-id' };

    mockStoreListener();
    expect(annotateTraceByRequest).not.toHaveBeenCalled();
    mockBridgeState = { quotes: [], quotesLastFetched: 1200 };
    mockStoreListener();
    mockStoreListener();
    now.mockReturnValue(1900);
    mockBridgeState = { quotes: [{}], quotesLastFetched: 1200 };
    mockStoreListener();

    expect(annotateTraceByRequest).toHaveBeenCalledTimes(2);
    expect(annotateTraceByRequest).toHaveBeenCalledWith(span, {
      request_sent_ms: 200,
    });
    expect(annotateTraceByRequest).toHaveBeenCalledWith(span, {
      first_quote_in_state_ms: 900,
    });
    expect(mockUnsubscribe).toHaveBeenCalled();
    now.mockRestore();
  });

  it('still traces when the Redux store is unavailable', () => {
    jest.spyOn(ReduxService, 'store', 'get').mockImplementation(() => {
      throw new Error('no store');
    });

    swapQuoteFetchTrace.start({ isRefresh: false });
    swapQuoteFetchTrace.finish('success');

    expect(mockTrace).toHaveBeenCalled();
    expect(annotateTraceByRequest).not.toHaveBeenCalled();
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({ data: { result: 'success' } }),
    );
    jest.restoreAllMocks();
  });
});
