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
  setPerpsPlaceOrderCufSymbol,
  setPerpsPlaceOrderCufToastShown,
  endPerpsPlaceOrderCufOnPositions,
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

  it('ends the place-order span from the stream when the symbol arrives', () => {
    startPerpsCufTrace({ name: TraceName.PerpsPlaceOrderToPositionRendered });
    setPerpsPlaceOrderCufSymbol('BTC');
    setPerpsPlaceOrderCufToastShown();

    endPerpsPlaceOrderCufOnPositions([{ symbol: 'ETH' }, { symbol: 'BTC' }]);

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.PerpsPlaceOrderToPositionRendered,
        data: expect.objectContaining({
          [PERPS_CUF_TAG.SUCCESS]: true,
          [PERPS_CUF_TAG.BOUNDARY]: PERPS_CUF_BOUNDARY.STREAM,
          [PERPS_CUF_TAG.TOAST_TO_POSITION_MS]: expect.any(Number),
        }),
      }),
    );
  });

  it('stream end ignores positions that do not match the pending symbol', () => {
    startPerpsCufTrace({ name: TraceName.PerpsPlaceOrderToPositionRendered });
    setPerpsPlaceOrderCufSymbol('BTC');

    endPerpsPlaceOrderCufOnPositions([{ symbol: 'ETH' }]);
    endPerpsPlaceOrderCufOnPositions(null);

    expect(mockEndTrace).not.toHaveBeenCalled();
  });

  it('stream end no-ops when no place-order span is pending', () => {
    endPerpsPlaceOrderCufOnPositions([{ symbol: 'BTC' }]);

    expect(mockEndTrace).not.toHaveBeenCalled();
  });
});
