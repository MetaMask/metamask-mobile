import type { AppStateStatus } from 'react-native';
import performance from 'react-native-performance';
import { v4 as uuidv4 } from 'uuid';
import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';

export type HomepagePerpsStream = 'positions' | 'orders';
export type HomepagePerpsDeliverySource =
  | 'memory_cache'
  | 'disk_cache'
  | 'resident_state'
  | 'fresh_socket';
export type HomepagePerformanceLifecycle =
  | 'cold_no_cache'
  | 'cold_disk_cache'
  | 'warm_foreground'
  | 'navigate_return'
  | 'background_short'
  | 'background_reconnect'
  | 'network_recovery'
  | 'account_switch';
export type HomepagePerpsContentVariant =
  | 'empty'
  | 'positions'
  | 'orders'
  | 'positions_and_orders'
  | 'trending'
  | 'pills'
  | 'error';

export interface HomepagePerpsDeliveryMetadata {
  deliveryId: string;
  stream: HomepagePerpsStream;
  source: HomepagePerpsDeliverySource;
  itemCount: number;
  receivedAtMonotonicMs: number;
  subscriberDeliveredAtMonotonicMs?: number;
  dataAgeMs: number;
  lifecycle: HomepagePerformanceLifecycle;
  accountGeneration: number;
}

export interface HomepagePerformanceDemand {
  demandId: string;
  startedAtMonotonicMs: number;
  lifecycle: HomepagePerformanceLifecycle;
  firstVisibleRecorded: boolean;
  firstFreshVisibleRecorded: boolean;
  cachedVisibleAtMonotonicMs?: number;
  cachedVisibleSource?: string;
  recordedFreshPipelineStreams: Set<HomepagePerpsStream>;
}

type HomepagePerformanceStage =
  | 'disk_cache_hydrated'
  | 'viewport_demand'
  | 'socket_received'
  | 'cache_write'
  | 'subscriber_delivery'
  | 'react_commit'
  | 'next_frame_checkpoint';

let diskCacheTimestampMs: number | null = null;
let firstDemand = true;
let accountGeneration = 0;
let lifecycle: HomepagePerformanceLifecycle = 'cold_no_cache';
let backgroundStartedAt: number | null = null;
const lifecycleListeners = new Set<() => void>();

const log = (payload: Record<string, unknown>) => {
  if (__DEV__) {
    DevLogger.log(`[HomepagePerf] ${JSON.stringify(payload)}`);
  }
};

export const logHomepagePerformanceStage = (
  stage: HomepagePerformanceStage,
  delivery?: HomepagePerpsDeliveryMetadata,
  detail: Record<string, unknown> = {},
) => {
  log({
    stage,
    monotonic_ms: Number(performance.now().toFixed(3)),
    ...(delivery && {
      delivery_id: delivery.deliveryId,
      stream: delivery.stream,
      source: delivery.source,
      item_count: delivery.itemCount,
      data_age_ms: Math.round(delivery.dataAgeMs),
      lifecycle: delivery.lifecycle,
      account_generation: delivery.accountGeneration,
    }),
    ...detail,
  });
};

const notifyLifecycleChange = () =>
  lifecycleListeners.forEach((listener) => listener());

export const subscribeHomepagePerformanceLifecycleChange = (
  listener: () => void,
) => {
  lifecycleListeners.add(listener);
  return () => {
    lifecycleListeners.delete(listener);
  };
};

export const handleHomepagePerformanceAppStateChange = (
  nextState: AppStateStatus,
) => {
  if (nextState === 'background' || nextState === 'inactive') {
    backgroundStartedAt ??= performance.now();
    return;
  }
  if (nextState !== 'active' || backgroundStartedAt === null) return;

  lifecycle =
    performance.now() - backgroundStartedAt <
    PERPS_CONSTANTS.ConnectionGracePeriodMs
      ? 'background_short'
      : 'background_reconnect';
  backgroundStartedAt = null;
  notifyLifecycleChange();
};

export const wasHomepagePerpsDiskCacheHydrated = () =>
  diskCacheTimestampMs !== null;
export const getHomepagePerpsDiskCacheAgeMs = () =>
  diskCacheTimestampMs === null
    ? 0
    : Math.max(0, Date.now() - diskCacheTimestampMs);

export const markHomepagePerpsDiskCacheHydrated = (rawValue: string) => {
  try {
    const parsed = JSON.parse(rawValue) as {
      timestamp?: number;
      entries?: { timestamp?: number }[];
    };
    const timestamps = [
      parsed.timestamp,
      ...(parsed.entries?.map((entry) => entry.timestamp) ?? []),
    ].filter((value): value is number => typeof value === 'number');
    diskCacheTimestampMs =
      timestamps.length > 0 ? Math.min(...timestamps) : null;
  } catch {
    diskCacheTimestampMs = null;
  }
  if (firstDemand) lifecycle = 'cold_disk_cache';
  logHomepagePerformanceStage('disk_cache_hydrated', undefined, {
    cache_age_ms: getHomepagePerpsDiskCacheAgeMs(),
  });
};

const setLifecycle = (next: HomepagePerformanceLifecycle) => {
  lifecycle = next;
  notifyLifecycleChange();
};

export const markHomepagePerpsNavigateReturn = () =>
  setLifecycle('navigate_return');
export const markHomepagePerpsNetworkRecovery = () =>
  setLifecycle('network_recovery');
export const markHomepagePerpsAccountSwitch = () => {
  accountGeneration += 1;
  setLifecycle('account_switch');
};

export const createHomepagePerpsDelivery = ({
  stream,
  source,
  itemCount,
  dataAgeMs = 0,
}: {
  stream: HomepagePerpsStream;
  source: HomepagePerpsDeliverySource;
  itemCount: number;
  dataAgeMs?: number;
}): HomepagePerpsDeliveryMetadata => ({
  deliveryId: uuidv4(),
  stream,
  source,
  itemCount,
  receivedAtMonotonicMs: performance.now(),
  dataAgeMs,
  lifecycle,
  accountGeneration,
});

export const createHomepagePerpsResidentDelivery = ({
  stream,
  itemCount,
  previousDelivery,
}: {
  stream: HomepagePerpsStream;
  itemCount: number;
  previousDelivery?: HomepagePerpsDeliveryMetadata;
}): HomepagePerpsDeliveryMetadata => {
  const now = performance.now();
  return {
    deliveryId: uuidv4(),
    stream,
    source: 'resident_state',
    itemCount,
    receivedAtMonotonicMs: previousDelivery?.receivedAtMonotonicMs ?? now,
    dataAgeMs: previousDelivery
      ? previousDelivery.dataAgeMs +
        now -
        previousDelivery.receivedAtMonotonicMs
      : 0,
    lifecycle,
    accountGeneration,
  };
};

export const createHomepagePerformanceDemand =
  (): HomepagePerformanceDemand => {
    const demand = {
      demandId: uuidv4(),
      startedAtMonotonicMs: performance.now(),
      lifecycle:
        firstDemand && diskCacheTimestampMs !== null
          ? ('cold_disk_cache' as const)
          : lifecycle,
      firstVisibleRecorded: false,
      firstFreshVisibleRecorded: false,
      recordedFreshPipelineStreams: new Set<HomepagePerpsStream>(),
    };
    firstDemand = false;
    logHomepagePerformanceStage('viewport_demand', undefined, {
      demand_id: demand.demandId,
      lifecycle: demand.lifecycle,
    });
    return demand;
  };

const recordTrace = ({
  name,
  start,
  end,
  tags,
  data,
}: {
  name: TraceName;
  start: number;
  end: number;
  tags: Record<string, string | boolean>;
  data: Record<string, string | number | boolean>;
}) => {
  const id = uuidv4();
  const endEpochMs = Date.now();
  const startEpochMs = endEpochMs - Math.max(0, end - start);
  trace({
    name,
    op: TraceOperation.PerpsHomepagePerformance,
    id,
    startTime: startEpochMs,
    tags,
  });
  endTrace({ name, id, timestamp: endEpochMs, data });
};

const hasBothStreams = (deliveries: HomepagePerpsDeliveryMetadata[]) => {
  const streams = new Set(deliveries.map(({ stream }) => stream));
  return streams.has('positions') && streams.has('orders');
};

export const recordHomepagePerpsVisibleFrame = ({
  demand,
  deliveries,
  contentVariant,
  reactCommitAtMonotonicMs,
  frameCheckpointAtMonotonicMs,
}: {
  demand: HomepagePerformanceDemand;
  deliveries: HomepagePerpsDeliveryMetadata[];
  contentVariant: HomepagePerpsContentVariant;
  reactCommitAtMonotonicMs: number;
  frameCheckpointAtMonotonicMs: number;
}) => {
  if (!hasBothStreams(deliveries)) return;

  const sources = new Set(deliveries.map(({ source }) => source));
  const deliverySource = sources.size === 1 ? deliveries[0].source : 'mixed';
  const dataReadyAtDemand = deliveries.every(
    ({ receivedAtMonotonicMs }) =>
      receivedAtMonotonicMs <= demand.startedAtMonotonicMs,
  );
  const tags = {
    lifecycle: demand.lifecycle,
    content_variant: contentVariant,
    delivery_source: deliverySource,
    data_ready_at_demand: dataReadyAtDemand,
    frame_boundary: 'next_frame_checkpoint',
    success: true,
  };

  if (!demand.firstVisibleRecorded) {
    recordTrace({
      name: TraceName.HomepagePerpsTimeToFirstVisibleContent,
      start: demand.startedAtMonotonicMs,
      end: frameCheckpointAtMonotonicMs,
      tags,
      data: {
        success: true,
        max_data_age_ms: Math.round(
          Math.max(...deliveries.map(({ dataAgeMs }) => dataAgeMs)),
        ),
      },
    });
    demand.firstVisibleRecorded = true;
    if (deliveries.some(({ source }) => source !== 'fresh_socket')) {
      demand.cachedVisibleAtMonotonicMs = frameCheckpointAtMonotonicMs;
      demand.cachedVisibleSource = deliverySource;
    }
  }

  deliveries.forEach((delivery) => {
    if (
      delivery.source !== 'fresh_socket' ||
      delivery.receivedAtMonotonicMs <= demand.startedAtMonotonicMs ||
      demand.recordedFreshPipelineStreams.has(delivery.stream)
    ) {
      return;
    }
    demand.recordedFreshPipelineStreams.add(delivery.stream);
    const subscriberAt =
      delivery.subscriberDeliveredAtMonotonicMs ??
      delivery.receivedAtMonotonicMs;
    recordTrace({
      name: TraceName.HomepagePerpsSocketToVisible,
      start: delivery.receivedAtMonotonicMs,
      end: frameCheckpointAtMonotonicMs,
      tags: {
        ...tags,
        delivery_source: 'fresh_socket',
        stream: delivery.stream,
      },
      data: {
        success: true,
        receipt_to_subscriber_ms: subscriberAt - delivery.receivedAtMonotonicMs,
        subscriber_to_react_commit_ms: reactCommitAtMonotonicMs - subscriberAt,
        react_commit_to_frame_checkpoint_ms:
          frameCheckpointAtMonotonicMs - reactCommitAtMonotonicMs,
      },
    });
  });

  const allFresh = deliveries.every(({ source }) => source === 'fresh_socket');
  if (!allFresh || demand.firstFreshVisibleRecorded) return;

  recordTrace({
    name: TraceName.HomepagePerpsTimeToFreshVisibleData,
    start: demand.startedAtMonotonicMs,
    end: frameCheckpointAtMonotonicMs,
    tags: { ...tags, delivery_source: 'fresh_socket' },
    data: { success: true },
  });
  demand.firstFreshVisibleRecorded = true;

  if (demand.cachedVisibleAtMonotonicMs !== undefined) {
    recordTrace({
      name: TraceName.HomepagePerpsCachedToFreshVisible,
      start: demand.cachedVisibleAtMonotonicMs,
      end: frameCheckpointAtMonotonicMs,
      tags: {
        ...tags,
        delivery_source: 'fresh_socket',
        cached_source: demand.cachedVisibleSource ?? 'mixed',
      },
      data: { success: true },
    });
  }
};

export const recordHomepagePerpsErrorFrame = ({
  demand,
  frameCheckpointAtMonotonicMs,
}: {
  demand: HomepagePerformanceDemand;
  frameCheckpointAtMonotonicMs: number;
}) => {
  if (demand.firstVisibleRecorded) return;
  recordTrace({
    name: TraceName.HomepagePerpsTimeToFirstVisibleContent,
    start: demand.startedAtMonotonicMs,
    end: frameCheckpointAtMonotonicMs,
    tags: {
      lifecycle: demand.lifecycle,
      content_variant: 'error',
      delivery_source: 'none',
      frame_boundary: 'next_frame_checkpoint',
      success: false,
    },
    data: { success: false, reason: 'connection_error_visible' },
  });
  demand.firstVisibleRecorded = true;
};

export const markHomepagePerformanceFrameComplete = (
  delivery: HomepagePerpsDeliveryMetadata,
) => {
  if (delivery.lifecycle === lifecycle) lifecycle = 'warm_foreground';
};

export const resetHomepagePerformanceProbeForTests = () => {
  diskCacheTimestampMs = null;
  firstDemand = true;
  accountGeneration = 0;
  lifecycle = 'cold_no_cache';
  backgroundStartedAt = null;
  lifecycleListeners.clear();
};
