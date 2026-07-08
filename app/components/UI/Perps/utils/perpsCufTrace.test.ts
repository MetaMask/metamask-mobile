import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import {
  startPerpsCufTrace,
  endPerpsCufTrace,
  endPerpsCufTraceAfter,
  armPerpsPlaceOrderCuf,
  isPerpsPlaceOrderCufCurrent,
  waitForPerpsPlaceOrderPositionRendered,
  watchPerpsCufPositionChanged,
  watchPerpsCufOrderAbsent,
  watchPerpsCufOrderPresent,
  watchPerpsCufAnyPositions,
  handlePerpsCufPositionsDelivered,
  handlePerpsCufOrdersDelivered,
  resetPerpsCufTraceForTests,
} from './perpsCufTrace';
import {
  PERPS_CUF_TAG,
  PERPS_CUF_VARIANT,
  PERPS_CUF_BOUNDARY,
} from '../constants/perpsCufTags';
import {
  markPerpsForegroundSettled,
  resetPerpsLifecycleContextForTests,
  PERPS_LIFECYCLE_CONTEXT,
} from './perpsLifecycleContext';

jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

const mockTrace = trace as jest.Mock;
const mockEndTrace = endTrace as jest.Mock;

describe('perpsCufTrace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPerpsLifecycleContextForTests();
    resetPerpsCufTraceForTests();
  });

  it('starts a span with a unique id and feature + lifecycle_context tags', () => {
    const opId = startPerpsCufTrace({
      name: TraceName.PerpsEntryToLiveMarketList,
    });

    expect(opId).toContain(TraceName.PerpsEntryToLiveMarketList);
    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.PerpsEntryToLiveMarketList,
        id: opId,
        op: TraceOperation.PerpsOperation,
        tags: expect.objectContaining({
          [PERPS_CUF_TAG.FEATURE]: PERPS_CONSTANTS.FeatureName,
          [PERPS_CUF_TAG.LIFECYCLE_CONTEXT]:
            PERPS_LIFECYCLE_CONTEXT.COLD_PROCESS,
        }),
      }),
    );
  });

  it('mints a distinct id for each start of the same trace name', () => {
    const a = startPerpsCufTrace({
      name: TraceName.PerpsCancelOrderToConfirmation,
    });
    const b = startPerpsCufTrace({
      name: TraceName.PerpsCancelOrderToConfirmation,
    });
    expect(a).not.toEqual(b);
  });

  it('merges caller variant tags without dropping the defaults', () => {
    markPerpsForegroundSettled();

    startPerpsCufTrace({
      name: TraceName.PerpsEntryToLiveMarketList,
      tags: { [PERPS_CUF_TAG.VARIANT]: PERPS_CUF_VARIANT.EMPTY },
    });

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: {
          [PERPS_CUF_TAG.FEATURE]: PERPS_CONSTANTS.FeatureName,
          [PERPS_CUF_TAG.LIFECYCLE_CONTEXT]: PERPS_LIFECYCLE_CONTEXT.WARM,
          [PERPS_CUF_TAG.VARIANT]: PERPS_CUF_VARIANT.EMPTY,
        },
      }),
    );
  });

  it('ends a started span by its op id', () => {
    const opId = startPerpsCufTrace({
      name: TraceName.PerpsEntryToLiveMarketList,
    });

    endPerpsCufTrace({ id: opId, data: { [PERPS_CUF_TAG.SUCCESS]: true } });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.PerpsEntryToLiveMarketList,
        id: opId,
        data: { [PERPS_CUF_TAG.SUCCESS]: true },
      }),
    );
  });

  it('end is idempotent: only the first end reaches endTrace', () => {
    const opId = startPerpsCufTrace({
      name: TraceName.PerpsEntryToLiveMarketList,
    });

    endPerpsCufTrace({ id: opId });
    endPerpsCufTrace({ id: opId });

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
  });

  it('scheduled fallback ends its own span when nothing else does', () => {
    jest.useFakeTimers();
    try {
      const opId = startPerpsCufTrace({
        name: TraceName.PerpsCancelOrderToConfirmation,
      });
      endPerpsCufTraceAfter(
        { id: opId, data: { [PERPS_CUF_TAG.SUCCESS]: false } },
        1000,
      );

      jest.advanceTimersByTime(1000);

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          id: opId,
          data: { [PERPS_CUF_TAG.SUCCESS]: false },
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('a superseded op fallback never ends a later op of the same flow', () => {
    jest.useFakeTimers();
    try {
      const first = startPerpsCufTrace({
        name: TraceName.PerpsCancelOrderToConfirmation,
      });
      endPerpsCufTraceAfter(
        { id: first, data: { [PERPS_CUF_TAG.SUCCESS]: false } },
        1000,
      );
      // The stream ends the first op, then a second cancel starts before the
      // first op's fallback fires.
      endPerpsCufTrace({ id: first, data: { [PERPS_CUF_TAG.SUCCESS]: true } });
      const second = startPerpsCufTrace({
        name: TraceName.PerpsCancelOrderToConfirmation,
      });
      mockEndTrace.mockClear();

      jest.advanceTimersByTime(2000);
      // The stale fallback targeted `first`, not `second`.
      expect(mockEndTrace).not.toHaveBeenCalled();

      endPerpsCufTrace({ id: second, data: { [PERPS_CUF_TAG.SUCCESS]: true } });
      expect(mockEndTrace).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('two overlapping cancels each end independently on their own order', () => {
    const opA = startPerpsCufTrace({
      name: TraceName.PerpsCancelOrderToConfirmation,
    });
    watchPerpsCufOrderAbsent(opA, 'o-A');
    const opB = startPerpsCufTrace({
      name: TraceName.PerpsCancelOrderToConfirmation,
    });
    watchPerpsCufOrderAbsent(opB, 'o-B');

    // o-A cancelled (absent), o-B still resting.
    handlePerpsCufOrdersDelivered([{ orderId: 'o-B' }]);
    expect(mockEndTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({ id: opA }),
    );

    // o-B cancelled too.
    handlePerpsCufOrdersDelivered([]);
    expect(mockEndTrace).toHaveBeenCalledTimes(2);
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({ id: opB }),
    );
  });

  it('resolves the place-order waiter when the armed symbol renders', async () => {
    const opId = startPerpsCufTrace({
      name: TraceName.PerpsPlaceOrderToPositionRendered,
    });
    armPerpsPlaceOrderCuf(opId, 'BTC');

    handlePerpsCufPositionsDelivered([
      { symbol: 'ETH', size: '1' },
      { symbol: 'BTC', size: '0.01' },
    ]);
    const rendered = await waitForPerpsPlaceOrderPositionRendered(5, opId);

    expect(rendered).toEqual({
      position: { symbol: 'BTC', size: '0.01' },
      renderedAt: expect.any(Number),
    });
  });

  it('resolves a waiter registered before the stream delivers', async () => {
    const opId = startPerpsCufTrace({
      name: TraceName.PerpsPlaceOrderToPositionRendered,
    });
    armPerpsPlaceOrderCuf(opId, 'BTC');

    const pendingWait = waitForPerpsPlaceOrderPositionRendered(1000, opId);
    handlePerpsCufPositionsDelivered([{ symbol: 'BTC', size: '0.01' }]);

    await expect(pendingWait).resolves.toEqual(
      expect.objectContaining({ position: { symbol: 'BTC', size: '0.01' } }),
    );
  });

  it('does not resolve for a pre-existing position unchanged from the baseline', async () => {
    const existing = { symbol: 'BTC', size: '0.01' };
    const opId = startPerpsCufTrace({
      name: TraceName.PerpsPlaceOrderToPositionRendered,
    });
    armPerpsPlaceOrderCuf(opId, 'BTC', existing);

    handlePerpsCufPositionsDelivered([existing]);

    await expect(
      waitForPerpsPlaceOrderPositionRendered(5, opId),
    ).resolves.toBeNull();
  });

  it('resolves when the armed position changes versus the baseline (add to position)', async () => {
    const opId = startPerpsCufTrace({
      name: TraceName.PerpsPlaceOrderToPositionRendered,
    });
    armPerpsPlaceOrderCuf(opId, 'BTC', { symbol: 'BTC', size: '0.01' });

    handlePerpsCufPositionsDelivered([{ symbol: 'BTC', size: '0.02' }]);

    await expect(
      waitForPerpsPlaceOrderPositionRendered(5, opId),
    ).resolves.toEqual(
      expect.objectContaining({ position: { symbol: 'BTC', size: '0.02' } }),
    );
  });

  it('ignores deliveries that do not match the armed symbol', async () => {
    const opId = startPerpsCufTrace({
      name: TraceName.PerpsPlaceOrderToPositionRendered,
    });
    armPerpsPlaceOrderCuf(opId, 'BTC');

    handlePerpsCufPositionsDelivered([{ symbol: 'ETH', size: '1' }]);
    handlePerpsCufPositionsDelivered(null);

    await expect(
      waitForPerpsPlaceOrderPositionRendered(5, opId),
    ).resolves.toBeNull();
  });

  it('waiter resolves null when its place-order span is no longer pending', async () => {
    const opId = startPerpsCufTrace({
      name: TraceName.PerpsPlaceOrderToPositionRendered,
    });
    armPerpsPlaceOrderCuf(opId, 'BTC');
    endPerpsCufTrace({ id: opId });

    await expect(
      waitForPerpsPlaceOrderPositionRendered(5, opId),
    ).resolves.toBeNull();
  });

  it('superseded waiter goes inert instead of touching the next order', async () => {
    const staleOpId = startPerpsCufTrace({
      name: TraceName.PerpsPlaceOrderToPositionRendered,
    });
    armPerpsPlaceOrderCuf(staleOpId, 'BTC');
    const staleWait = waitForPerpsPlaceOrderPositionRendered(5, staleOpId);

    // A second order re-arms before the first waiter settles.
    const opId = startPerpsCufTrace({
      name: TraceName.PerpsPlaceOrderToPositionRendered,
    });
    armPerpsPlaceOrderCuf(opId, 'ETH');
    const liveWait = waitForPerpsPlaceOrderPositionRendered(1000, opId);

    await expect(staleWait).resolves.toBeNull();
    expect(isPerpsPlaceOrderCufCurrent(staleOpId)).toBe(false);

    // The stale waiter's timeout must not have cleared the live resolver.
    handlePerpsCufPositionsDelivered([{ symbol: 'ETH', size: '2' }]);
    await expect(liveWait).resolves.toEqual(
      expect.objectContaining({ position: { symbol: 'ETH', size: '2' } }),
    );
  });

  const btc = { symbol: 'BTC', size: '0.01', takeProfitPrice: '70000' };

  it('close span ends when the watched position disappears', () => {
    const opId = startPerpsCufTrace({
      name: TraceName.PerpsClosePositionToConfirmation,
    });
    watchPerpsCufPositionChanged(opId, btc);

    handlePerpsCufPositionsDelivered([{ symbol: 'ETH', size: '1' }]);

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        id: opId,
        data: expect.objectContaining({
          [PERPS_CUF_TAG.BOUNDARY]: PERPS_CUF_BOUNDARY.STREAM,
        }),
      }),
    );
  });

  it('close span ends on a size change but not on an identical snapshot', () => {
    const opId = startPerpsCufTrace({
      name: TraceName.PerpsClosePositionToConfirmation,
    });
    watchPerpsCufPositionChanged(opId, btc);

    handlePerpsCufPositionsDelivered([btc]);
    expect(mockEndTrace).not.toHaveBeenCalled();

    handlePerpsCufPositionsDelivered([{ ...btc, size: '0.005' }]);
    expect(mockEndTrace).toHaveBeenCalledTimes(1);
  });

  it('tpsl span ends when the TP value changes in the stream', () => {
    const opId = startPerpsCufTrace({
      name: TraceName.PerpsUpdateTPSLToConfirmation,
    });
    watchPerpsCufPositionChanged(opId, btc);

    handlePerpsCufPositionsDelivered([{ ...btc, takeProfitPrice: '71000' }]);

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({ id: opId }),
    );
  });

  it('cancel span ends only once the order id is absent', () => {
    const opId = startPerpsCufTrace({
      name: TraceName.PerpsCancelOrderToConfirmation,
    });
    watchPerpsCufOrderAbsent(opId, 'o-1');

    handlePerpsCufOrdersDelivered([{ orderId: 'o-1' }, { orderId: 'o-2' }]);
    expect(mockEndTrace).not.toHaveBeenCalled();

    handlePerpsCufOrdersDelivered([{ orderId: 'o-2' }]);
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({ id: opId }),
    );
  });

  it('limit-order-render span ends once the order id appears in the stream', () => {
    const opId = startPerpsCufTrace({
      name: TraceName.PerpsPlaceLimitOrderToOrderRendered,
    });
    watchPerpsCufOrderPresent(opId, 'o-9');

    handlePerpsCufOrdersDelivered([{ orderId: 'o-1' }]);
    expect(mockEndTrace).not.toHaveBeenCalled();

    handlePerpsCufOrdersDelivered([{ orderId: 'o-1' }, { orderId: 'o-9' }]);
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        id: opId,
        data: expect.objectContaining({
          [PERPS_CUF_TAG.BOUNDARY]: PERPS_CUF_BOUNDARY.STREAM,
        }),
      }),
    );
  });

  it('cancel and limit-render order spans resolve independently on one delivery', () => {
    const cancelOpId = startPerpsCufTrace({
      name: TraceName.PerpsCancelOrderToConfirmation,
    });
    watchPerpsCufOrderAbsent(cancelOpId, 'o-1');
    const limitOpId = startPerpsCufTrace({
      name: TraceName.PerpsPlaceLimitOrderToOrderRendered,
    });
    watchPerpsCufOrderPresent(limitOpId, 'o-2');

    // o-1 gone (cancel confirmed) and o-2 present (limit rendered) in the
    // same delivery: both spans end.
    handlePerpsCufOrdersDelivered([{ orderId: 'o-2' }]);

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({ id: cancelOpId }),
    );
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({ id: limitOpId }),
    );
  });

  it('reconnect span ends on any positions delivery', () => {
    const opId = startPerpsCufTrace({
      name: TraceName.PerpsWebSocketReconnectToFreshData,
    });
    watchPerpsCufAnyPositions(opId);

    handlePerpsCufPositionsDelivered([]);

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({ id: opId }),
    );
  });

  it('flushes throttled subscribers before ending a matched confirmation', () => {
    const opId = startPerpsCufTrace({
      name: TraceName.PerpsCancelOrderToConfirmation,
    });
    watchPerpsCufOrderAbsent(opId, 'o-1');
    const flush = jest.fn();

    handlePerpsCufOrdersDelivered([{ orderId: 'o-2' }], flush);

    expect(flush).toHaveBeenCalledTimes(1);
    // Flush happens before the span end.
    expect(flush.mock.invocationCallOrder[0]).toBeLessThan(
      mockEndTrace.mock.invocationCallOrder[0],
    );
  });

  it('does not flush when no confirmation matches the delivery', () => {
    const opId = startPerpsCufTrace({
      name: TraceName.PerpsCancelOrderToConfirmation,
    });
    watchPerpsCufOrderAbsent(opId, 'o-1');
    const flush = jest.fn();

    // o-1 still present -> no match -> no flush.
    handlePerpsCufOrdersDelivered([{ orderId: 'o-1' }], flush);

    expect(flush).not.toHaveBeenCalled();
  });
});
