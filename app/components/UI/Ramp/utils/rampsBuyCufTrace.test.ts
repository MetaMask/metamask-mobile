import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import {
  startRampsBuyCufTrace,
  endRampsBuyCufTrace,
  endRampsBuyCufTraceAfter,
  startRampsBuyCufChildTrace,
  endRampsBuyCufChildTrace,
  endOpenRampsBuyCufChildrenByName,
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
}));

const mockTrace = trace as jest.Mock;
const mockEndTrace = endTrace as jest.Mock;

describe('rampsBuyCufTrace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    resetRampsBuyCufTraceForTests();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('surfaceFromBuyFlowOrigin', () => {
    it('maps tokenInfo to token_buy', () => {
      expect(surfaceFromBuyFlowOrigin('tokenInfo')).toBe(
        RAMPS_BUY_CUF_SURFACE.TOKEN_BUY,
      );
    });

    it('maps homeTokenList to home_token_list', () => {
      expect(surfaceFromBuyFlowOrigin('homeTokenList')).toBe(
        RAMPS_BUY_CUF_SURFACE.HOME_TOKEN_LIST,
      );
    });

    it('returns unknown when buyFlowOrigin is omitted', () => {
      expect(surfaceFromBuyFlowOrigin()).toBe(RAMPS_BUY_CUF_SURFACE.UNKNOWN);
    });
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
        // tags → transaction filters; data → Attributes panel (with success)
        tags: startFields,
        data: startFields,
      }),
    );
    expect(getRampsBuyCufParentContext()).toEqual({ mocked: 'parent-span' });
  });

  it('mints a distinct id for each parent start', () => {
    const a = startRampsBuyCufTrace();
    // Second start supersedes the first but keeps minting a new op id.
    const b = startRampsBuyCufTrace();

    expect(a).not.toEqual(b);
  });

  it('supersedes a prior parent when a new Buy E2E starts', () => {
    const first = startRampsBuyCufTrace({
      surface: RAMPS_BUY_CUF_SURFACE.EMPTY_STATE,
    });

    const second = startRampsBuyCufTrace({
      surface: RAMPS_BUY_CUF_SURFACE.DEEP_LINK,
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RampBuyToOrderDetails,
        id: first,
        data: {
          [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
          [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.SUPERSEDED,
        },
      }),
    );
    expect(second).not.toEqual(first);
    expect(hasActiveRampsBuyCufTrace()).toBe(true);
  });

  it('ends a started parent by the current single-flight id', () => {
    const opId = startRampsBuyCufTrace();

    endRampsBuyCufTrace({
      data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true },
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RampBuyToOrderDetails,
        id: opId,
        data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true },
      }),
    );
    expect(hasActiveRampsBuyCufTrace()).toBe(false);
    expect(getRampsBuyCufParentContext()).toBeUndefined();
  });

  it('end is idempotent: only the first end reaches endTrace', () => {
    startRampsBuyCufTrace();

    endRampsBuyCufTrace({ data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true } });
    endRampsBuyCufTrace({ data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true } });

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
  });

  it('ignores end when id does not match the active parent', () => {
    startRampsBuyCufTrace();

    endRampsBuyCufTrace({ id: 'other-id' });

    expect(mockEndTrace).not.toHaveBeenCalled();
    expect(hasActiveRampsBuyCufTrace()).toBe(true);
  });

  it('ends the parent as timeout after the fallback delay', () => {
    const opId = startRampsBuyCufTrace();

    jest.advanceTimersByTime(RAMPS_BUY_CUF_TIMEOUT_MS);

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RampBuyToOrderDetails,
        id: opId,
        data: {
          [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
          [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.TIMEOUT,
        },
      }),
    );
  });

  it('timeout fallback no-ops when the parent already ended', () => {
    startRampsBuyCufTrace();
    endRampsBuyCufTrace({ data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true } });
    mockEndTrace.mockClear();

    jest.advanceTimersByTime(RAMPS_BUY_CUF_TIMEOUT_MS);

    expect(mockEndTrace).not.toHaveBeenCalled();
  });

  it('endRampsBuyCufTraceAfter only ends the parent it was scheduled for', () => {
    const first = startRampsBuyCufTrace();
    endRampsBuyCufTraceAfter(
      {
        data: {
          [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
          [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.TIMEOUT,
        },
      },
      1000,
    );
    // Supersede: first ends as superseded; second becomes active.
    startRampsBuyCufTrace();
    mockEndTrace.mockClear();

    jest.advanceTimersByTime(1000);

    // The short timer was for `first`, which is no longer active.
    expect(mockEndTrace).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: first }),
    );
  });

  it('starts a child nested under the active parent context', () => {
    startRampsBuyCufTrace();
    mockTrace.mockClear();

    const childId = startRampsBuyCufChildTrace({
      name: TraceName.RampBuyContinueToCheckout,
    });

    expect(childId).toContain(TraceName.RampBuyContinueToCheckout);
    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RampBuyContinueToCheckout,
        id: childId,
        op: TraceOperation.RampOperation,
        parentContext: { mocked: 'parent-span' },
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

  it('skips child start when no parent is active', () => {
    const childId = startRampsBuyCufChildTrace({
      name: TraceName.RampBuyContinueToCheckout,
    });

    expect(childId).toBeNull();
    expect(mockTrace).not.toHaveBeenCalled();
  });

  it('ends a child by op id and is idempotent', () => {
    startRampsBuyCufTrace();
    const childId = startRampsBuyCufChildTrace({
      name: TraceName.RampBuyContinueToCheckout,
    });
    expect(childId).not.toBeNull();

    endRampsBuyCufChildTrace({
      id: childId as string,
      data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true },
    });
    endRampsBuyCufChildTrace({
      id: childId as string,
      data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true },
    });

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RampBuyContinueToCheckout,
        id: childId,
        data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true },
      }),
    );
  });

  it('ends open children by name', () => {
    startRampsBuyCufTrace();
    const a = startRampsBuyCufChildTrace({
      name: TraceName.RampBuyNativeToOrderCreated,
    });
    const b = startRampsBuyCufChildTrace({
      name: TraceName.RampBuyContinueToCheckout,
    });

    const ended = endOpenRampsBuyCufChildrenByName(
      TraceName.RampBuyNativeToOrderCreated,
      { [RAMPS_BUY_CUF_TAG.SUCCESS]: true },
    );

    expect(ended).toBe(1);
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RampBuyNativeToOrderCreated,
        id: a,
        data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true },
      }),
    );
    // Other child remains open until ended explicitly or parent ends.
    expect(mockEndTrace).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: b }),
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
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RampBuyToOrderDetails,
        data: { [RAMPS_BUY_CUF_TAG.SUCCESS]: true },
      }),
    );
  });
});
