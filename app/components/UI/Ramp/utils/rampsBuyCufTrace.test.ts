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
  endRampsBuyCufChildTrace,
  endOpenRampsBuyCufChildrenByName,
  startRampsBuyQuoteFetchTrace,
  endRampsBuyQuoteFetchTrace,
  getRampsBuyCufParentContext,
  hasActiveRampsBuyCufTrace,
  hasOpenRampsBuyCufChildByName,
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
    const opId = startRampsBuyCufTrace({
      surface: RAMPS_BUY_CUF_SURFACE.FUND_MENU,
    });
    const startFields = {
      [RAMPS_BUY_CUF_TAG.FEATURE]: RAMPS_BUY_CUF_FEATURE,
      [RAMPS_BUY_CUF_TAG.RAMP_TYPE]: 'UNIFIED_BUY_2',
      [RAMPS_BUY_CUF_TAG.SURFACE]: RAMPS_BUY_CUF_SURFACE.FUND_MENU,
    };
    expect(opId).toContain(TraceName.RampBuyToOrderDetails);
    expect(hasActiveRampsBuyCufTrace()).toBe(true);
    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RampBuyToOrderDetails,
        id: opId,
        op: TraceOperation.RampOperation,
        forceTransaction: true,
        tags: startFields,
        data: startFields,
      }),
    );
    expect(getRampsBuyCufParentContext()).toEqual({ mocked: 'parent-span' });
  });

  it('keeps one parent while open, remints after end or Sentry cleanup', () => {
    const first = startRampsBuyCufTrace({
      surface: RAMPS_BUY_CUF_SURFACE.EMPTY_STATE,
    });
    expect(
      startRampsBuyCufTrace({ surface: RAMPS_BUY_CUF_SURFACE.DEEP_LINK }),
    ).toEqual(first);
    expect(mockTrace).toHaveBeenCalledTimes(1);
    endRampsBuyCufTrace({ data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true } });
    const afterEnd = startRampsBuyCufTrace();
    expect(afterEnd).not.toEqual(first);
    mockGetTraceContext.mockReturnValue(undefined);
    expect(
      startRampsBuyCufTrace({ surface: RAMPS_BUY_CUF_SURFACE.DEEP_LINK }),
    ).not.toEqual(afterEnd);
  });

  it('ends parents idempotently, ignores mismatched ids, and times out', () => {
    startRampsBuyCufTrace();
    endRampsBuyCufTrace({ id: 'other-id' });
    expect(mockEndTrace).not.toHaveBeenCalled();
    endRampsBuyCufTrace({ data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true } });
    endRampsBuyCufTrace({ data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true } });
    expect(mockEndTrace).toHaveBeenCalledTimes(1);
    expect(hasActiveRampsBuyCufTrace()).toBe(false);
    expect(getRampsBuyCufParentContext()).toBeUndefined();

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
    startRampsBuyCufTrace();
    endRampsBuyCufTrace({ data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true } });
    mockEndTrace.mockClear();
    jest.advanceTimersByTime(RAMPS_BUY_CUF_TIMEOUT_MS);
    expect(mockEndTrace).not.toHaveBeenCalled();
  });

  it('nests, ends, and abandons child spans under the parent', () => {
    expect(
      startRampsBuyCufChildTrace({ name: TraceName.RampBuyContinueToCheckout }),
    ).toBeNull();
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

    it('ends success and error completions by op id', () => {
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

      mockEndTrace.mockClear();
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

  describe('hasOpenRampsBuyCufChildByName (TRAM-3781)', () => {
    it('is false when no child of that name is open', () => {
      expect(
        hasOpenRampsBuyCufChildByName(
          TraceName.RampBuyNativeKycAndOrderCreation,
        ),
      ).toBe(false);
    });

    it('is true while a matching child is open, false once it ends', () => {
      startRampsBuyCufTrace();
      const opId = startRampsBuyCufChildTrace({
        name: TraceName.RampBuyNativeKycAndOrderCreation,
      });

      expect(
        hasOpenRampsBuyCufChildByName(
          TraceName.RampBuyNativeKycAndOrderCreation,
        ),
      ).toBe(true);
      // A different name shouldn't match.
      expect(hasOpenRampsBuyCufChildByName(TraceName.RampBuyNativeAuth)).toBe(
        false,
      );

      endOpenRampsBuyCufChildrenByName(
        TraceName.RampBuyNativeKycAndOrderCreation,
        { [RAMPS_BUY_CUF_TAG.SUCCESS]: true },
      );

      expect(opId).not.toBeNull();
      expect(
        hasOpenRampsBuyCufChildByName(
          TraceName.RampBuyNativeKycAndOrderCreation,
        ),
      ).toBe(false);
    });

    it('does not re-open after being ended directly by id', () => {
      startRampsBuyCufTrace();
      const opId = startRampsBuyCufChildTrace({
        name: TraceName.RampBuyNativeAuth,
      });
      expect(opId).not.toBeNull();

      endRampsBuyCufChildTrace({ id: opId as string });

      expect(hasOpenRampsBuyCufChildByName(TraceName.RampBuyNativeAuth)).toBe(
        false,
      );
    });
  });
});
