import {
  trace,
  endTrace,
  getTraceContext,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import {
  startRampsBuyCufTrace,
  endRampsBuyCufTrace,
  startRampsBuyCufChildTrace,
  endOpenRampsBuyCufChildrenByName,
  startRampsBuyQuoteFetchTrace,
  endRampsBuyQuoteFetchTrace,
  getRampsBuyCufParentContext,
  hasActiveRampsBuyCufTrace,
  surfaceFromBuyFlowOrigin,
  resetRampsBuyCufTraceForTests,
} from './rampsBuyCufTrace';
import {
  RAMPS_BUY_CUF_FEATURE,
  RAMPS_BUY_CUF_SURFACE,
  RAMPS_BUY_CUF_TAG,
  RAMPS_BUY_CUF_END_REASON,
  RAMPS_BUY_CUF_TIMEOUT_MS,
} from '../constants/rampsBuyCufTags';

jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  trace: jest.fn(() => ({ mocked: 'parent-span' })),
  endTrace: jest.fn(),
  getTraceContext: jest.fn(() => ({ mocked: 'parent-span' })),
}));

const mockTrace = trace as jest.Mock;
const mockEndTrace = endTrace as jest.Mock;
const mockGetTraceContext = getTraceContext as jest.Mock;

describe('rampsBuyCufTrace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    resetRampsBuyCufTraceForTests();
    mockTrace.mockReturnValue({ mocked: 'parent-span' });
    mockGetTraceContext.mockReturnValue({ mocked: 'parent-span' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    ['tokenInfo', RAMPS_BUY_CUF_SURFACE.TOKEN_BUY],
    ['homeTokenList', RAMPS_BUY_CUF_SURFACE.HOME_TOKEN_LIST],
    [undefined, RAMPS_BUY_CUF_SURFACE.UNKNOWN],
  ] as const)('surfaceFromBuyFlowOrigin(%s) → %s', (origin, expected) => {
    expect(surfaceFromBuyFlowOrigin(origin)).toBe(expected);
  });

  it('starts a parent span with feature, ramp_type, and surface as tags and attributes', () => {
    const fields = {
      [RAMPS_BUY_CUF_TAG.FEATURE]: RAMPS_BUY_CUF_FEATURE,
      [RAMPS_BUY_CUF_TAG.RAMP_TYPE]: 'UNIFIED_BUY_2',
      [RAMPS_BUY_CUF_TAG.SURFACE]: RAMPS_BUY_CUF_SURFACE.FUND_MENU,
    };

    const opId = startRampsBuyCufTrace({
      surface: RAMPS_BUY_CUF_SURFACE.FUND_MENU,
    });

    expect(opId).toContain(TraceName.RampBuyToOrderDetails);
    expect(hasActiveRampsBuyCufTrace()).toBe(true);
    expect(getRampsBuyCufParentContext()).toEqual({ mocked: 'parent-span' });
    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RampBuyToOrderDetails,
        id: opId,
        op: TraceOperation.RampOperation,
        forceTransaction: true,
        tags: fields,
        data: fields,
      }),
    );
  });

  it('returns the open parent op id on a second start', () => {
    const first = startRampsBuyCufTrace({
      surface: RAMPS_BUY_CUF_SURFACE.EMPTY_STATE,
    });

    expect(
      startRampsBuyCufTrace({ surface: RAMPS_BUY_CUF_SURFACE.DEEP_LINK }),
    ).toEqual(first);
    expect(mockTrace).toHaveBeenCalledTimes(1);
  });

  it('starts a new parent after the previous parent ends', () => {
    const first = startRampsBuyCufTrace();
    endRampsBuyCufTrace({ data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true } });

    expect(startRampsBuyCufTrace()).not.toEqual(first);
  });

  it('starts a new parent when Sentry no longer has the parent span', () => {
    const first = startRampsBuyCufTrace();
    mockGetTraceContext.mockReturnValue(undefined);

    expect(
      startRampsBuyCufTrace({ surface: RAMPS_BUY_CUF_SURFACE.DEEP_LINK }),
    ).not.toEqual(first);
  });

  it('keeps single-flight when the parent start was consent-buffered', () => {
    mockTrace.mockReturnValue(undefined);
    mockGetTraceContext.mockReturnValue(undefined);

    const first = startRampsBuyCufTrace({
      surface: RAMPS_BUY_CUF_SURFACE.FUND_MENU,
    });

    expect(hasActiveRampsBuyCufTrace()).toBe(true);
    expect(getRampsBuyCufParentContext()).toBeUndefined();
    expect(
      startRampsBuyCufTrace({ surface: RAMPS_BUY_CUF_SURFACE.DEEP_LINK }),
    ).toEqual(first);
    expect(mockTrace).toHaveBeenCalledTimes(1);
  });

  it('ends a consent-buffered parent without clearing it as stale first', () => {
    mockTrace.mockReturnValue(undefined);
    mockGetTraceContext.mockReturnValue(undefined);

    const opId = startRampsBuyCufTrace();
    endRampsBuyCufTrace({ data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true } });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RampBuyToOrderDetails,
        id: opId,
        data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true },
      }),
    );
    expect(hasActiveRampsBuyCufTrace()).toBe(false);
  });

  it('starts standalone quote fetches while the parent is consent-buffered', () => {
    mockTrace.mockReturnValue(undefined);
    mockGetTraceContext.mockReturnValue(undefined);
    startRampsBuyCufTrace();
    mockTrace.mockClear();
    mockTrace.mockReturnValue(undefined);

    const opId = startRampsBuyQuoteFetchTrace();

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RampBuyQuoteFetch,
        id: opId,
        parentContext: undefined,
        forceTransaction: true,
      }),
    );
    expect(hasActiveRampsBuyCufTrace()).toBe(true);
  });

  it('ignores end when the id does not match the open parent', () => {
    startRampsBuyCufTrace();

    endRampsBuyCufTrace({ id: 'other-id' });

    expect(mockEndTrace).not.toHaveBeenCalled();
    expect(hasActiveRampsBuyCufTrace()).toBe(true);
  });

  it('ends the open parent once and clears module state', () => {
    startRampsBuyCufTrace();

    endRampsBuyCufTrace({ data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true } });
    endRampsBuyCufTrace({ data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true } });

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
    expect(hasActiveRampsBuyCufTrace()).toBe(false);
    expect(getRampsBuyCufParentContext()).toBeUndefined();
  });

  it('ends the parent with timeout reason after the CUF timeout', () => {
    const timedOutId = startRampsBuyCufTrace();

    jest.advanceTimersByTime(RAMPS_BUY_CUF_TIMEOUT_MS);

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RampBuyToOrderDetails,
        id: timedOutId,
        data: {
          [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
          [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.TIMEOUT,
        },
      }),
    );
  });

  it('does not end a parent from a stale timeout after a successful end', () => {
    startRampsBuyCufTrace();
    endRampsBuyCufTrace({ data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true } });
    mockEndTrace.mockClear();

    jest.advanceTimersByTime(RAMPS_BUY_CUF_TIMEOUT_MS);

    expect(mockEndTrace).not.toHaveBeenCalled();
  });

  it('returns null when starting a child without an open parent', () => {
    expect(
      startRampsBuyCufChildTrace({ name: TraceName.RampBuyContinueToCheckout }),
    ).toBeNull();
  });

  it('nests a child span under the open parent context', () => {
    startRampsBuyCufTrace();
    mockTrace.mockClear();

    const childId = startRampsBuyCufChildTrace({
      name: TraceName.RampBuyContinueToCheckout,
    });

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RampBuyContinueToCheckout,
        id: childId,
        parentContext: { mocked: 'parent-span' },
      }),
    );
  });

  it('ends open children that match the requested name', () => {
    startRampsBuyCufTrace();
    const nativeId = startRampsBuyCufChildTrace({
      name: TraceName.RampBuyNativeToOrderCreated,
    });
    mockEndTrace.mockClear();

    expect(
      endOpenRampsBuyCufChildrenByName(TraceName.RampBuyNativeToOrderCreated, {
        [RAMPS_BUY_CUF_TAG.SUCCESS]: true,
      }),
    ).toBe(1);
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({ id: nativeId }),
    );
  });

  it('abandons open children when the parent ends', () => {
    startRampsBuyCufTrace();
    const childId = startRampsBuyCufChildTrace({
      name: TraceName.RampBuyContinueToCheckout,
    });
    mockEndTrace.mockClear();

    endRampsBuyCufTrace({ data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true } });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RampBuyContinueToCheckout,
        id: childId,
        data: {
          [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
          [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.ABANDONED,
        },
      }),
    );
  });

  describe('Buy Quote Fetch CUF (TRAM-3780)', () => {
    it('starts a standalone quote span when no E2E parent is active', () => {
      const opId = startRampsBuyQuoteFetchTrace();

      expect(opId).toContain(TraceName.RampBuyQuoteFetch);
      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.RampBuyQuoteFetch,
          id: opId,
          op: TraceOperation.RampOperation,
          parentContext: undefined,
          forceTransaction: true,
          tags: expect.objectContaining({
            [RAMPS_BUY_CUF_TAG.FEATURE]: RAMPS_BUY_CUF_FEATURE,
          }),
          data: expect.objectContaining({
            [RAMPS_BUY_CUF_TAG.FEATURE]: RAMPS_BUY_CUF_FEATURE,
            [RAMPS_BUY_CUF_TAG.RAMP_TYPE]: 'UNIFIED_BUY_2',
          }),
        }),
      );
    });

    it('nests under the active Buy E2E parent when one is open', () => {
      startRampsBuyCufTrace();
      mockTrace.mockClear();

      const opId = startRampsBuyQuoteFetchTrace();

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.RampBuyQuoteFetch,
          id: opId,
          parentContext: { mocked: 'parent-span' },
          forceTransaction: false,
        }),
      );
    });

    it('supersedes a prior open quote fetch', () => {
      const first = startRampsBuyQuoteFetchTrace();
      const second = startRampsBuyQuoteFetchTrace();

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.RampBuyQuoteFetch,
          id: first,
          data: {
            [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
            [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.SUPERSEDED,
          },
        }),
      );
      expect(second).not.toEqual(first);
    });

    it('ends a successful quote fetch by op id', () => {
      const successId = startRampsBuyQuoteFetchTrace();
      endRampsBuyQuoteFetchTrace({
        id: successId,
        data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true },
      });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.RampBuyQuoteFetch,
          id: successId,
          data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true },
        }),
      );
    });

    it('ends a failed quote fetch by op id', () => {
      const errorId = startRampsBuyQuoteFetchTrace();
      endRampsBuyQuoteFetchTrace({
        id: errorId,
        data: {
          [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
          [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.ERROR,
        },
      });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.RampBuyQuoteFetch,
          id: errorId,
          data: {
            [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
            [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.ERROR,
          },
        }),
      );
    });
  });
});
