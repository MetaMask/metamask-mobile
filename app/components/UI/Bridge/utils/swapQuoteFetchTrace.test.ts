import { v4 as uuidv4 } from 'uuid';
import { QuoteStreamCompleteReason } from '@metamask/bridge-controller';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import ReduxService from '../../../../core/redux';
import { swapQuoteFetchTrace } from './swapQuoteFetchTrace';
import type { BridgeToken } from '../types';

jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

let mockReduxQuotes: unknown[] = [];
let mockStoreListener: (() => void) | undefined;
const mockUnsubscribe = jest.fn();

jest.mock('../../../../core/redux', () => ({
  __esModule: true,
  default: {
    get store(): {
      getState: () => unknown;
      subscribe: (listener: () => void) => () => void;
    } {
      return {
        getState: (): unknown => ({
          engine: {
            backgroundState: { BridgeController: { quotes: mockReduxQuotes } },
          },
        }),
        subscribe: (listener: () => void): (() => void) => {
          mockStoreListener = listener;
          return mockUnsubscribe;
        },
      };
    },
  },
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
    jest.restoreAllMocks();
    mockUuid.mockReturnValue('quote-trace-id');
    mockReduxQuotes = [];
    mockStoreListener = undefined;
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

  it.each([
    ['success', { result: 'success', first_quote_rendered_ms: 0 }],
    ['cancelled', { result: 'cancelled' }],
  ] as const)(
    'does not attach a no-quote reason to %s traces',
    (result, expectedData) => {
      jest.spyOn(Date, 'now').mockReturnValue(1000);
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
        expect.objectContaining({ data: expectedData }),
      );
    },
  );

  describe('phase timestamps', () => {
    const startAt = (
      now: number,
    ): { id: string; dateNow: jest.SpyInstance<number, []> } => {
      const dateNow = jest.spyOn(Date, 'now').mockReturnValue(now);
      const id = swapQuoteFetchTrace.start({
        srcChainId: sourceToken.chainId,
        destChainId: sameChainDestinationToken.chainId,
        isRefresh: false,
      });
      return { id, dateNow };
    };

    it('records all phases relative to span start on success', () => {
      const { id, dateNow } = startAt(1000);

      dateNow.mockReturnValue(1100);
      swapQuoteFetchTrace.markRequestSent(id);
      dateNow.mockReturnValue(2500);
      mockReduxQuotes = [{ quote: {} }];
      mockStoreListener?.();
      dateNow.mockReturnValue(2900);
      swapQuoteFetchTrace.finish('success');

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.SwapQuoteFetch,
        id,
        timestamp: 2900,
        data: {
          result: 'success',
          request_sent_ms: 100,
          first_quote_in_state_ms: 1500,
          first_quote_rendered_ms: 1900,
        },
      });
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('records the request-sent phase only once and only for the active trace', () => {
      const { id, dateNow } = startAt(1000);

      dateNow.mockReturnValue(1050);
      swapQuoteFetchTrace.markRequestSent('other-trace-id');
      dateNow.mockReturnValue(1200);
      swapQuoteFetchTrace.markRequestSent(id);
      dateNow.mockReturnValue(1300);
      swapQuoteFetchTrace.markRequestSent(id);
      swapQuoteFetchTrace.finish('cancelled');

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { result: 'cancelled', request_sent_ms: 200 },
        }),
      );
    });

    it('ignores quotes already in state when the span started and empty quotes', () => {
      mockReduxQuotes = [{ quote: 'stale' }];
      const { dateNow } = startAt(1000);

      dateNow.mockReturnValue(1200);
      mockStoreListener?.();
      mockReduxQuotes = [];
      mockStoreListener?.();
      dateNow.mockReturnValue(1800);
      mockReduxQuotes = [{ quote: 'fresh' }];
      mockStoreListener?.();
      dateNow.mockReturnValue(1900);
      mockReduxQuotes = [{ quote: 'fresh' }, { quote: 'second' }];
      mockStoreListener?.();
      swapQuoteFetchTrace.finish('success');

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ first_quote_in_state_ms: 800 }),
        }),
      );
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('does not carry phases over to the next trace', () => {
      const first = startAt(1000);
      swapQuoteFetchTrace.markRequestSent(first.id);
      mockUuid.mockReturnValue('next-trace-id');
      swapQuoteFetchTrace.start({
        srcChainId: sourceToken.chainId,
        destChainId: sameChainDestinationToken.chainId,
        isRefresh: false,
      });
      swapQuoteFetchTrace.finish('cancelled');

      expect(mockEndTrace).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: 'next-trace-id',
          data: { result: 'cancelled' },
        }),
      );
    });

    it('starts and finishes normally when the Redux store is unavailable', () => {
      jest.spyOn(ReduxService, 'store', 'get').mockImplementation(() => {
        throw new Error('Redux store does not exist!');
      });

      expect(() => startAt(1000)).not.toThrow();
      expect(() => swapQuoteFetchTrace.finish('success')).not.toThrow();
      expect(mockTrace).toHaveBeenCalledTimes(1);
      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { result: 'success', first_quote_rendered_ms: 0 },
        }),
      );
    });

    it('stops watching the store when reading state throws', () => {
      startAt(1000);
      jest.spyOn(ReduxService, 'store', 'get').mockImplementation(() => {
        throw new Error('boom');
      });

      expect(() => mockStoreListener?.()).not.toThrow();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});
