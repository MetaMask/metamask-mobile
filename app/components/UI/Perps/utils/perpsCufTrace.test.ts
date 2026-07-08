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
  armPerpsPlaceOrderCuf,
  isPerpsPlaceOrderCufCurrent,
  waitForPerpsPlaceOrderPositionRendered,
  watchPerpsCufPositionChanged,
  watchPerpsCufOrderAbsent,
  watchPerpsCufAnyPositions,
  handlePerpsCufPositionsDelivered,
  handlePerpsCufOrdersDelivered,
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
    // Drain any span left pending by a previous test.
    endPerpsCufTrace({ name: TraceName.PerpsEntryToLiveMarketList });
    endPerpsCufTrace({ name: TraceName.PerpsPlaceOrderToPositionRendered });
    endPerpsCufTrace({ name: TraceName.PerpsClosePositionToConfirmation });
    endPerpsCufTrace({ name: TraceName.PerpsUpdateTPSLToConfirmation });
    endPerpsCufTrace({ name: TraceName.PerpsCancelOrderToConfirmation });
    endPerpsCufTrace({ name: TraceName.PerpsWebSocketReconnectToFreshData });
    jest.clearAllMocks();
  });

  it('starts a span tagged with feature and lifecycle_context', () => {
    startPerpsCufTrace({ name: TraceName.PerpsEntryToLiveMarketList });

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.PerpsEntryToLiveMarketList,
        id: TraceName.PerpsEntryToLiveMarketList,
        op: TraceOperation.PerpsOperation,
        tags: expect.objectContaining({
          [PERPS_CUF_TAG.FEATURE]: PERPS_CONSTANTS.FeatureName,
          [PERPS_CUF_TAG.LIFECYCLE_CONTEXT]:
            PERPS_LIFECYCLE_CONTEXT.COLD_PROCESS,
        }),
      }),
    );
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

  it('ends a started span and defaults the id to the trace name', () => {
    startPerpsCufTrace({ name: TraceName.PerpsEntryToLiveMarketList });

    endPerpsCufTrace({
      name: TraceName.PerpsEntryToLiveMarketList,
      data: { [PERPS_CUF_TAG.SUCCESS]: true },
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.PerpsEntryToLiveMarketList,
        id: TraceName.PerpsEntryToLiveMarketList,
        data: { [PERPS_CUF_TAG.SUCCESS]: true },
      }),
    );
  });

  it('end is idempotent: only the first end reaches endTrace', () => {
    startPerpsCufTrace({ name: TraceName.PerpsEntryToLiveMarketList });

    endPerpsCufTrace({ name: TraceName.PerpsEntryToLiveMarketList });
    endPerpsCufTrace({ name: TraceName.PerpsEntryToLiveMarketList });

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
  });

  it('resolves the place-order waiter when the armed symbol renders', async () => {
    startPerpsCufTrace({ name: TraceName.PerpsPlaceOrderToPositionRendered });
    const generation = armPerpsPlaceOrderCuf('BTC');

    handlePerpsCufPositionsDelivered([
      { symbol: 'ETH', size: '1' },
      { symbol: 'BTC', size: '0.01' },
    ]);
    const rendered = await waitForPerpsPlaceOrderPositionRendered(
      5,
      generation,
    );

    expect(rendered).toEqual({
      position: { symbol: 'BTC', size: '0.01' },
      renderedAt: expect.any(Number),
    });
  });

  it('resolves a waiter registered before the stream delivers', async () => {
    startPerpsCufTrace({ name: TraceName.PerpsPlaceOrderToPositionRendered });
    const generation = armPerpsPlaceOrderCuf('BTC');

    const pendingWait = waitForPerpsPlaceOrderPositionRendered(
      1000,
      generation,
    );
    handlePerpsCufPositionsDelivered([{ symbol: 'BTC', size: '0.01' }]);

    await expect(pendingWait).resolves.toEqual(
      expect.objectContaining({ position: { symbol: 'BTC', size: '0.01' } }),
    );
  });

  it('does not resolve for a pre-existing position unchanged from the baseline', async () => {
    const existing = { symbol: 'BTC', size: '0.01' };
    startPerpsCufTrace({ name: TraceName.PerpsPlaceOrderToPositionRendered });
    const generation = armPerpsPlaceOrderCuf('BTC', existing);

    handlePerpsCufPositionsDelivered([existing]);

    await expect(
      waitForPerpsPlaceOrderPositionRendered(5, generation),
    ).resolves.toBeNull();
  });

  it('resolves when the armed position changes versus the baseline (add to position)', async () => {
    startPerpsCufTrace({ name: TraceName.PerpsPlaceOrderToPositionRendered });
    const generation = armPerpsPlaceOrderCuf('BTC', {
      symbol: 'BTC',
      size: '0.01',
    });

    handlePerpsCufPositionsDelivered([{ symbol: 'BTC', size: '0.02' }]);

    await expect(
      waitForPerpsPlaceOrderPositionRendered(5, generation),
    ).resolves.toEqual(
      expect.objectContaining({ position: { symbol: 'BTC', size: '0.02' } }),
    );
  });

  it('ignores deliveries that do not match the armed symbol', async () => {
    startPerpsCufTrace({ name: TraceName.PerpsPlaceOrderToPositionRendered });
    const generation = armPerpsPlaceOrderCuf('BTC');

    handlePerpsCufPositionsDelivered([{ symbol: 'ETH', size: '1' }]);
    handlePerpsCufPositionsDelivered(null);

    await expect(
      waitForPerpsPlaceOrderPositionRendered(5, generation),
    ).resolves.toBeNull();
  });

  it('waiter resolves null when no place-order span is pending', async () => {
    const generation = armPerpsPlaceOrderCuf('BTC');
    endPerpsCufTrace({ name: TraceName.PerpsPlaceOrderToPositionRendered });

    await expect(
      waitForPerpsPlaceOrderPositionRendered(5, generation),
    ).resolves.toBeNull();
  });

  it('superseded waiter goes inert instead of touching the next order', async () => {
    startPerpsCufTrace({ name: TraceName.PerpsPlaceOrderToPositionRendered });
    const staleGeneration = armPerpsPlaceOrderCuf('BTC');
    const staleWait = waitForPerpsPlaceOrderPositionRendered(
      5,
      staleGeneration,
    );

    // A second order re-arms before the first waiter settles.
    const generation = armPerpsPlaceOrderCuf('ETH');
    const liveWait = waitForPerpsPlaceOrderPositionRendered(1000, generation);

    await expect(staleWait).resolves.toBeNull();
    expect(isPerpsPlaceOrderCufCurrent(staleGeneration)).toBe(false);

    // The stale waiter's timeout must not have cleared the live resolver.
    handlePerpsCufPositionsDelivered([{ symbol: 'ETH', size: '2' }]);
    await expect(liveWait).resolves.toEqual(
      expect.objectContaining({ position: { symbol: 'ETH', size: '2' } }),
    );
  });

  const btc = { symbol: 'BTC', size: '0.01', takeProfitPrice: '70000' };

  it('close span ends when the watched position disappears', () => {
    startPerpsCufTrace({ name: TraceName.PerpsClosePositionToConfirmation });
    watchPerpsCufPositionChanged(
      TraceName.PerpsClosePositionToConfirmation,
      btc,
    );

    handlePerpsCufPositionsDelivered([{ symbol: 'ETH', size: '1' }]);

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.PerpsClosePositionToConfirmation,
        data: expect.objectContaining({
          [PERPS_CUF_TAG.BOUNDARY]: PERPS_CUF_BOUNDARY.STREAM,
        }),
      }),
    );
  });

  it('close span ends on a size change but not on an identical snapshot', () => {
    startPerpsCufTrace({ name: TraceName.PerpsClosePositionToConfirmation });
    watchPerpsCufPositionChanged(
      TraceName.PerpsClosePositionToConfirmation,
      btc,
    );

    handlePerpsCufPositionsDelivered([btc]);
    expect(mockEndTrace).not.toHaveBeenCalled();

    handlePerpsCufPositionsDelivered([{ ...btc, size: '0.005' }]);
    expect(mockEndTrace).toHaveBeenCalledTimes(1);
  });

  it('tpsl span ends when the TP value changes in the stream', () => {
    startPerpsCufTrace({ name: TraceName.PerpsUpdateTPSLToConfirmation });
    watchPerpsCufPositionChanged(TraceName.PerpsUpdateTPSLToConfirmation, btc);

    handlePerpsCufPositionsDelivered([{ ...btc, takeProfitPrice: '71000' }]);

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.PerpsUpdateTPSLToConfirmation,
      }),
    );
  });

  it('cancel span ends only once the order id is absent', () => {
    startPerpsCufTrace({ name: TraceName.PerpsCancelOrderToConfirmation });
    watchPerpsCufOrderAbsent(TraceName.PerpsCancelOrderToConfirmation, 'o-1');

    handlePerpsCufOrdersDelivered([{ orderId: 'o-1' }, { orderId: 'o-2' }]);
    expect(mockEndTrace).not.toHaveBeenCalled();

    handlePerpsCufOrdersDelivered([{ orderId: 'o-2' }]);
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.PerpsCancelOrderToConfirmation,
      }),
    );
  });

  it('reconnect span ends on any positions delivery', () => {
    startPerpsCufTrace({ name: TraceName.PerpsWebSocketReconnectToFreshData });
    watchPerpsCufAnyPositions(TraceName.PerpsWebSocketReconnectToFreshData);

    handlePerpsCufPositionsDelivered([]);

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.PerpsWebSocketReconnectToFreshData,
      }),
    );
  });
});
