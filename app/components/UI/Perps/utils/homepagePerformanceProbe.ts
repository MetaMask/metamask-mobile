import type { AppStateStatus } from 'react-native';
import performance from 'react-native-performance';
import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import { v4 as uuidv4 } from 'uuid';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

export type HomepagePerpsStream = 'positions' | 'orders' | 'markets' | 'prices';
export type HomepagePerpsDeliverySource =
  | 'memory_cache'
  | 'disk_cache'
  | 'provider_snapshot'
  | 'terminal_global_snapshot_v2'
  | 'provider'
  | 'resident_state'
  | 'fresh_socket'
  | 'unknown';
export type HomepagePerformanceLifecycle =
  | 'cold_no_cache'
  | 'cold_disk_cache'
  | 'warm_foreground'
  | 'navigate_return'
  | 'background_short'
  | 'background_reconnect'
  | 'network_recovery'
  | 'account_switch'
  | 'perps_network_switch'
  | 'provider_switch';
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
  originSource?: HomepagePerpsDeliverySource;
  itemCount: number;
  receivedAtMonotonicMs: number;
  subscriberDeliveredAtMonotonicMs?: number;
  dataAgeMs: number;
  lifecycle: HomepagePerformanceLifecycle;
  accountGeneration: number;
  contextGeneration: number;
}

export interface HomepagePerformanceDemand {
  demandId: string;
  startedAtMonotonicMs: number;
  lifecycleStartedAtMonotonicMs: number;
  lifecycle: HomepagePerformanceLifecycle;
  accountGeneration: number;
  contextGeneration: number;
  firstVisibleRecorded: boolean;
  firstFreshVisibleRecorded: boolean;
  cachedVisibleAtMonotonicMs?: number;
  cachedVisibleSource?: string;
  recordedFreshPipelineStreams: Set<HomepagePerpsStream>;
  recordedSocketPipelineStreams: Set<HomepagePerpsStream>;
}

type HomepagePerformanceStage =
  | 'disk_cache_hydrated'
  | 'surface_demand'
  | 'connection_attempt_started'
  | 'provider_initialized'
  | 'health_check_completed'
  | 'connection_established'
  | 'subscriptions_preloaded'
  | 'connection_with_preload_completed'
  | 'account_bundle_request_started'
  | 'account_bundle_cache_accepted'
  | 'account_bundle_accepted'
  | 'account_bundle_discarded'
  | 'market_snapshot_request_started'
  | 'market_snapshot_resolved'
  | 'market_snapshot_error'
  | 'socket_received'
  | 'cache_write'
  | 'subscriber_delivery'
  | 'react_commit'
  | 'values_visible'
  | 'first_frame_checkpoint'
  | 'next_frame_checkpoint'
  | 'surface_resolved_recorded'
  | 'surface_live_recorded';

let diskCacheTimestampMs: number | null = null;
let firstDemand = true;
let accountGeneration = 0;
let contextGeneration = 0;
let lifecycle: HomepagePerformanceLifecycle = 'cold_no_cache';
let lifecycleStartedAtMonotonicMs = performance.now();
let backgroundStartedAt: number | null = null;
let activeObservationCount = 0;
const lifecycleListeners = new Set<() => void>();
export const isHomepagePerformanceProbeActive = () =>
  activeObservationCount > 0;

export const activateHomepagePerformanceProbe = () => {
  activeObservationCount += 1;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    activeObservationCount = Math.max(0, activeObservationCount - 1);
  };
};

export const logHomepagePerformanceStage = (
  stage: HomepagePerformanceStage,
  delivery?: HomepagePerpsDeliveryMetadata,
  detail: Record<string, unknown> = {},
) => {
  if (!__DEV__ || !isHomepagePerformanceProbeActive()) return;

  DevLogger.log(
    `[PerpsPerf] ${JSON.stringify({
      stage,
      monotonic_ms: Number(performance.now().toFixed(3)),
      ...(delivery && {
        delivery_id: delivery.deliveryId,
        stream: delivery.stream,
        source: delivery.source,
        ...(delivery.originSource && { origin_source: delivery.originSource }),
        item_count: delivery.itemCount,
        data_age_ms: Math.round(delivery.dataAgeMs),
        lifecycle: delivery.lifecycle,
        account_generation: delivery.accountGeneration,
        context_generation: delivery.contextGeneration,
      }),
      ...detail,
    })}`,
  );
};

export const logHomepageConnectionStage = (
  stage: Extract<
    HomepagePerformanceStage,
    | 'connection_attempt_started'
    | 'provider_initialized'
    | 'health_check_completed'
    | 'connection_established'
    | 'subscriptions_preloaded'
    | 'connection_with_preload_completed'
  >,
  detail: Record<string, unknown>,
) => {
  logHomepagePerformanceStage(stage, undefined, detail);
};

export const logHomepageAccountStage = (
  stage: Extract<
    HomepagePerformanceStage,
    | 'account_bundle_request_started'
    | 'account_bundle_cache_accepted'
    | 'account_bundle_accepted'
    | 'account_bundle_discarded'
  >,
  detail: Record<string, unknown>,
) => {
  logHomepagePerformanceStage(stage, undefined, detail);
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

  const foregroundedAt = performance.now();
  lifecycle =
    foregroundedAt - backgroundStartedAt <
    PERPS_CONSTANTS.ConnectionGracePeriodMs
      ? 'background_short'
      : 'background_reconnect';
  lifecycleStartedAtMonotonicMs = foregroundedAt;
  backgroundStartedAt = null;
  queueMicrotask(notifyLifecycleChange);
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
  if (firstDemand && diskCacheTimestampMs !== null) {
    lifecycle = 'cold_disk_cache';
    lifecycleStartedAtMonotonicMs = performance.now();
  }
  logHomepagePerformanceStage('disk_cache_hydrated', undefined, {
    cache_age_ms: getHomepagePerpsDiskCacheAgeMs(),
  });
};

const setLifecycle = (
  next: HomepagePerformanceLifecycle,
  { advancesContext = false }: { advancesContext?: boolean } = {},
) => {
  if (lifecycle === next && !advancesContext) return;
  if (advancesContext) contextGeneration += 1;
  lifecycle = next;
  lifecycleStartedAtMonotonicMs = performance.now();
  notifyLifecycleChange();
};

export const markHomepagePerpsNavigateReturn = () => {
  if (
    lifecycle === 'cold_no_cache' ||
    lifecycle === 'cold_disk_cache' ||
    lifecycle === 'warm_foreground' ||
    lifecycle === 'navigate_return'
  ) {
    setLifecycle('navigate_return');
  }
};

export const markHomepagePerpsNetworkRecovery = () =>
  setLifecycle('network_recovery');

export const markHomepagePerpsNetworkSwitch = () =>
  setLifecycle('perps_network_switch', { advancesContext: true });

export const markHomepagePerpsProviderSwitch = () =>
  setLifecycle('provider_switch', { advancesContext: true });

export const markHomepagePerpsAccountSwitch = () => {
  accountGeneration += 1;
  setLifecycle('account_switch', { advancesContext: true });
};

export const createHomepagePerpsDelivery = ({
  stream,
  source,
  itemCount,
  dataAgeMs = 0,
  originSource,
}: {
  stream: HomepagePerpsStream;
  source: HomepagePerpsDeliverySource;
  itemCount: number;
  dataAgeMs?: number;
  originSource?: HomepagePerpsDeliverySource;
}): HomepagePerpsDeliveryMetadata => ({
  deliveryId: uuidv4(),
  stream,
  source,
  ...(originSource && { originSource }),
  itemCount,
  receivedAtMonotonicMs: performance.now(),
  dataAgeMs,
  lifecycle,
  accountGeneration,
  contextGeneration,
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
    originSource: previousDelivery?.originSource ?? previousDelivery?.source,
    itemCount,
    receivedAtMonotonicMs: previousDelivery?.receivedAtMonotonicMs ?? now,
    dataAgeMs: previousDelivery
      ? previousDelivery.dataAgeMs +
        now -
        previousDelivery.receivedAtMonotonicMs
      : 0,
    lifecycle,
    accountGeneration: previousDelivery?.accountGeneration ?? accountGeneration,
    contextGeneration: previousDelivery?.contextGeneration ?? contextGeneration,
  };
};

export const createHomepagePerformanceDemand =
  (): HomepagePerformanceDemand => {
    const demand: HomepagePerformanceDemand = {
      demandId: uuidv4(),
      startedAtMonotonicMs: performance.now(),
      lifecycleStartedAtMonotonicMs,
      lifecycle,
      accountGeneration,
      contextGeneration,
      firstVisibleRecorded: false,
      firstFreshVisibleRecorded: false,
      recordedFreshPipelineStreams: new Set<HomepagePerpsStream>(),
      recordedSocketPipelineStreams: new Set<HomepagePerpsStream>(),
    };
    firstDemand = false;
    logHomepagePerformanceStage('surface_demand', undefined, {
      demand_id: demand.demandId,
      lifecycle: demand.lifecycle,
      account_generation: demand.accountGeneration,
      context_generation: demand.contextGeneration,
    });
    return demand;
  };

export const isHomepagePerpsDeliveryFreshForDemand = (
  delivery: HomepagePerpsDeliveryMetadata,
  demand: HomepagePerformanceDemand,
  isConnectionLive = false,
) =>
  (delivery.receivedAtMonotonicMs >= demand.lifecycleStartedAtMonotonicMs ||
    (demand.lifecycle === 'navigate_return' &&
      isConnectionLive &&
      delivery.source === 'resident_state' &&
      delivery.originSource === 'fresh_socket')) &&
  delivery.accountGeneration === demand.accountGeneration &&
  delivery.contextGeneration === demand.contextGeneration &&
  (delivery.source === 'fresh_socket' ||
    delivery.source === 'provider_snapshot' ||
    delivery.source === 'terminal_global_snapshot_v2' ||
    delivery.source === 'provider' ||
    ((delivery.source === 'resident_state' ||
      delivery.source === 'memory_cache') &&
      (delivery.originSource === 'fresh_socket' ||
        delivery.originSource === 'provider_snapshot' ||
        delivery.originSource === 'terminal_global_snapshot_v2' ||
        delivery.originSource === 'provider')));

const hasRequiredStreams = (
  deliveries: HomepagePerpsDeliveryMetadata[],
  contentVariant: HomepagePerpsContentVariant,
) => {
  const streams = new Set(deliveries.map(({ stream }) => stream));
  const hasAccountResolution =
    streams.has('positions') && streams.has('orders');
  return contentVariant === 'trending' || contentVariant === 'pills'
    ? hasAccountResolution && streams.has('markets')
    : hasAccountResolution;
};

const getRequiredDeliveries = (
  deliveries: HomepagePerpsDeliveryMetadata[],
  contentVariant: HomepagePerpsContentVariant,
) => {
  const requiresMarkets =
    contentVariant === 'trending' || contentVariant === 'pills';
  return deliveries.filter(
    ({ stream }) =>
      stream === 'positions' || stream === 'orders' || requiresMarkets,
  );
};

const getVisibleDeliveries = (
  deliveries: HomepagePerpsDeliveryMetadata[],
  contentVariant: HomepagePerpsContentVariant,
) => {
  if (contentVariant === 'positions') {
    return deliveries.filter(({ stream }) => stream === 'positions');
  }
  if (contentVariant === 'orders') {
    return deliveries.filter(({ stream }) => stream === 'orders');
  }
  return getRequiredDeliveries(deliveries, contentVariant);
};

const hasVisibleStreams = (
  deliveries: HomepagePerpsDeliveryMetadata[],
  contentVariant: HomepagePerpsContentVariant,
) => {
  const streams = new Set(deliveries.map(({ stream }) => stream));
  if (contentVariant === 'positions') return streams.has('positions');
  if (contentVariant === 'orders') return streams.has('orders');
  return hasRequiredStreams(deliveries, contentVariant);
};

const getEffectiveSource = (delivery: HomepagePerpsDeliveryMetadata) =>
  delivery.source === 'resident_state' || delivery.source === 'memory_cache'
    ? (delivery.originSource ?? delivery.source)
    : delivery.source;

export const recordHomepagePerpsVisibleFrame = ({
  demand,
  deliveries,
  contentVariant,
  isConnectionLive = false,
  frameCheckpointAtMonotonicMs,
}: {
  demand: HomepagePerformanceDemand;
  deliveries: HomepagePerpsDeliveryMetadata[];
  contentVariant: HomepagePerpsContentVariant;
  isConnectionLive?: boolean;
  reactCommitAtMonotonicMs: number;
  frameCheckpointAtMonotonicMs: number;
}) => {
  const visibleDeliveries = getVisibleDeliveries(deliveries, contentVariant);
  if (!hasVisibleStreams(visibleDeliveries, contentVariant)) {
    return;
  }
  if (
    visibleDeliveries.some(
      (delivery) =>
        delivery.accountGeneration !== demand.accountGeneration ||
        delivery.contextGeneration !== demand.contextGeneration,
    )
  ) {
    return;
  }

  const tagsFor = (tagDeliveries: HomepagePerpsDeliveryMetadata[]) => {
    const sources = new Set(tagDeliveries.map(({ source }) => source));
    const deliverySource =
      sources.size === 1 ? tagDeliveries[0].source : 'mixed';
    const sourceFor = (stream: HomepagePerpsStream) => {
      const delivery = tagDeliveries.find(
        (candidate) => candidate.stream === stream,
      );
      return delivery ? getEffectiveSource(delivery) : 'not_required';
    };
    return {
      instrumentation_schema: 'homepage_perps_visible_v4',
      lifecycle: demand.lifecycle,
      account_generation: String(demand.accountGeneration),
      context_generation: String(demand.contextGeneration),
      content_variant: contentVariant,
      delivery_source: deliverySource,
      positions_source: sourceFor('positions'),
      orders_source: sourceFor('orders'),
      markets_source: sourceFor('markets'),
      data_ready_at_demand: tagDeliveries.every(
        ({ receivedAtMonotonicMs }) =>
          receivedAtMonotonicMs <= demand.startedAtMonotonicMs,
      ),
      frame_boundary: 'next_frame_checkpoint',
      success: true,
    };
  };
  const visibleTags = tagsFor(visibleDeliveries);

  if (!demand.firstVisibleRecorded) {
    demand.firstVisibleRecorded = true;
    logHomepagePerformanceStage('surface_resolved_recorded', undefined, {
      demand_id: demand.demandId,
      frame_checkpoint_monotonic_ms: frameCheckpointAtMonotonicMs,
      duration_ms: Number(
        (frameCheckpointAtMonotonicMs - demand.startedAtMonotonicMs).toFixed(3),
      ),
      ...visibleTags,
    });
    if (
      visibleDeliveries.some(
        (delivery) =>
          !isHomepagePerpsDeliveryFreshForDemand(
            delivery,
            demand,
            isConnectionLive,
          ),
      )
    ) {
      demand.cachedVisibleAtMonotonicMs = frameCheckpointAtMonotonicMs;
      demand.cachedVisibleSource = visibleTags.delivery_source;
    }
  }

  const requiredDeliveries = getRequiredDeliveries(deliveries, contentVariant);
  const hasCompleteRequiredStreams = hasRequiredStreams(
    requiredDeliveries,
    contentVariant,
  );

  if (
    !hasCompleteRequiredStreams ||
    requiredDeliveries.some(
      (delivery) =>
        delivery.accountGeneration !== demand.accountGeneration ||
        delivery.contextGeneration !== demand.contextGeneration,
    )
  ) {
    return;
  }

  const allFresh = requiredDeliveries.every((delivery) =>
    isHomepagePerpsDeliveryFreshForDemand(delivery, demand, isConnectionLive),
  );
  if (!allFresh || demand.firstFreshVisibleRecorded) return;

  const freshnessSources = new Set(requiredDeliveries.map(getEffectiveSource));
  const freshnessSource =
    freshnessSources.size === 1
      ? (freshnessSources.values().next().value ?? 'mixed')
      : 'mixed';
  const freshTags = tagsFor(requiredDeliveries);

  demand.firstFreshVisibleRecorded = true;
  logHomepagePerformanceStage('surface_live_recorded', undefined, {
    demand_id: demand.demandId,
    frame_checkpoint_monotonic_ms: frameCheckpointAtMonotonicMs,
    duration_ms: Number(
      (frameCheckpointAtMonotonicMs - demand.startedAtMonotonicMs).toFixed(3),
    ),
    ...freshTags,
    freshness_source: freshnessSource,
  });
};

export const recordHomepagePerpsErrorFrame = ({
  demand,
  frameCheckpointAtMonotonicMs,
}: {
  demand: HomepagePerformanceDemand;
  frameCheckpointAtMonotonicMs: number;
}) => {
  if (demand.firstVisibleRecorded) return;
  demand.firstVisibleRecorded = true;
  logHomepagePerformanceStage('surface_resolved_recorded', undefined, {
    demand_id: demand.demandId,
    frame_checkpoint_monotonic_ms: frameCheckpointAtMonotonicMs,
    duration_ms: Number(
      (frameCheckpointAtMonotonicMs - demand.startedAtMonotonicMs).toFixed(3),
    ),
    content_variant: 'error',
    success: false,
  });
};

export const markHomepagePerformanceDemandComplete = () => {
  lifecycle = 'warm_foreground';
  lifecycleStartedAtMonotonicMs = performance.now();
};

export const resetHomepagePerformanceProbeForTests = () => {
  diskCacheTimestampMs = null;
  firstDemand = true;
  accountGeneration = 0;
  contextGeneration = 0;
  lifecycle = 'cold_no_cache';
  lifecycleStartedAtMonotonicMs = performance.now();
  backgroundStartedAt = null;
  activeObservationCount = 0;
  lifecycleListeners.clear();
};
