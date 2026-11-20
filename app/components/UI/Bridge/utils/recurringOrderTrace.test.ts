import { FeatureId } from '@metamask/bridge-controller';
import { v4 as uuidv4 } from 'uuid';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import {
  cancelRecurringOrderTrace,
  finishRecurringOrderTrace,
  startRecurringOrderCancelTrace,
  startRecurringOrderCreateTrace,
  startRecurringOrdersListTrace,
} from './recurringOrderTrace';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  endTrace: jest.fn(),
  trace: jest.fn(),
}));

const mockUuid = uuidv4 as jest.Mock<string>;

describe('recurringOrderTrace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(100);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records list context and buckets the settled result count', () => {
    mockUuid.mockReturnValue('list-trace-id');

    const handle = startRecurringOrdersListTrace({
      listType: 'history',
      hasNetworkFilter: true,
    });
    finishRecurringOrderTrace(handle, {
      result: 'success',
      resultCount: 6,
    });

    expect(trace).toHaveBeenCalledWith({
      name: TraceName.RecurringOrdersListReady,
      op: TraceOperation.BridgeScreenPerformance,
      id: 'list-trace-id',
      data: {
        list_type: 'history',
        has_network_filter: true,
      },
      startTime: 100,
      tags: { feature: FeatureId.RECURRING_ORDER },
    });
    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.RecurringOrdersListReady,
      id: 'list-trace-id',
      timestamp: 100,
      status: 'ok',
      data: {
        result: 'success',
        result_count_bucket: '6-20',
      },
    });
  });

  it('records the create failure phase and finishes a trace only once', () => {
    mockUuid.mockReturnValue('create-trace-id');

    const handle = startRecurringOrderCreateTrace();
    finishRecurringOrderTrace(handle, {
      result: 'error',
      failurePhase: 'signing',
    });
    finishRecurringOrderTrace(handle, { result: 'success' });

    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RecurringOrderCreate,
        op: TraceOperation.BridgeExecution,
        id: 'create-trace-id',
      }),
    );
    expect(endTrace).toHaveBeenCalledTimes(1);
    expect(endTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        data: {
          result: 'error',
          failure_phase: 'signing',
        },
      }),
    );
  });

  it('marks an unfinished cancellation trace as cancelled', () => {
    mockUuid.mockReturnValue('cancel-trace-id');

    const handle = startRecurringOrderCancelTrace();
    cancelRecurringOrderTrace(handle);

    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.RecurringOrderCancel,
        op: TraceOperation.BridgeExecution,
        id: 'cancel-trace-id',
      }),
    );
    expect(endTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        data: { result: 'cancelled' },
      }),
    );
  });
});
