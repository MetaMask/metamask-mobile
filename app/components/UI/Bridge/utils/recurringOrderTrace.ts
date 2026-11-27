import { FeatureId } from '@metamask/bridge-controller';
import { v4 as uuidv4 } from 'uuid';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';

export type RecurringOrdersListType = 'open' | 'history';
export type RecurringOrderCreateFailurePhase =
  | 'account_upgrade'
  | 'delegation_prepare'
  | 'signing'
  | 'create';

type RecurringOrderTraceName =
  | TraceName.RecurringOrdersListReady
  | TraceName.RecurringOrderCreate
  | TraceName.RecurringOrderCancel;

type RecurringOrderTraceResult = 'success' | 'empty' | 'error' | 'cancelled';

export interface RecurringOrderTraceHandle {
  id: string;
  name: RecurringOrderTraceName;
}

interface FinishRecurringOrderTraceParams {
  result: RecurringOrderTraceResult;
  failurePhase?: RecurringOrderCreateFailurePhase;
  resultCount?: number;
}

const activeTraceIds = new Set<string>();

function startRecurringOrderTrace(
  name: RecurringOrderTraceName,
  op: TraceOperation,
  data?: Record<string, string | boolean>,
): RecurringOrderTraceHandle {
  const id = uuidv4();

  trace({
    name,
    op,
    id,
    data,
    startTime: Date.now(),
    tags: { feature: FeatureId.RECURRING_ORDER },
  });
  activeTraceIds.add(id);

  return { id, name };
}

function getResultCountBucket(resultCount: number): string {
  if (resultCount === 0) {
    return '0';
  }

  if (resultCount <= 5) {
    return '1-5';
  }

  if (resultCount <= 20) {
    return '6-20';
  }

  return '21+';
}

export function startRecurringOrdersListTrace({
  listType,
  hasNetworkFilter,
}: {
  listType: RecurringOrdersListType;
  hasNetworkFilter: boolean;
}): RecurringOrderTraceHandle {
  return startRecurringOrderTrace(
    TraceName.RecurringOrdersListReady,
    TraceOperation.BridgeScreenPerformance,
    {
      list_type: listType,
      has_network_filter: hasNetworkFilter,
    },
  );
}

export function startRecurringOrderCreateTrace(): RecurringOrderTraceHandle {
  return startRecurringOrderTrace(
    TraceName.RecurringOrderCreate,
    TraceOperation.BridgeExecution,
  );
}

export function startRecurringOrderCancelTrace(): RecurringOrderTraceHandle {
  return startRecurringOrderTrace(
    TraceName.RecurringOrderCancel,
    TraceOperation.BridgeExecution,
  );
}

export function finishRecurringOrderTrace(
  handle: RecurringOrderTraceHandle,
  { result, failurePhase, resultCount }: FinishRecurringOrderTraceParams,
): void {
  if (!activeTraceIds.delete(handle.id)) {
    return;
  }

  endTrace({
    name: handle.name,
    id: handle.id,
    timestamp: Date.now(),
    status: result === 'error' ? 'error' : 'ok',
    data: {
      result,
      ...(failurePhase ? { failure_phase: failurePhase } : {}),
      ...(resultCount === undefined
        ? {}
        : { result_count_bucket: getResultCountBucket(resultCount) }),
    },
  });
}

export function cancelRecurringOrderTrace(
  handle: RecurringOrderTraceHandle,
): void {
  finishRecurringOrderTrace(handle, { result: 'cancelled' });
}
