import type { AppStateStatus } from 'react-native';
import performance from 'react-native-performance';
import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import { v4 as uuidv4 } from 'uuid';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type {
  PerpsLoadingLifecycle,
  PerpsLoadingSource,
  PerpsLoadingStream,
} from './perpsLoadingSession';

export type HomepagePerpsStream = PerpsLoadingStream;
export type HomepagePerpsDeliverySource = PerpsLoadingSource | 'resident_state';
export type HomepagePerformanceLifecycle = PerpsLoadingLifecycle;
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
  residentWrappedAtMonotonicMs?: number;
  dataAgeMs: number;
  lifecycle: HomepagePerformanceLifecycle;
  accountGeneration: number;
  contextGeneration: number;
  bundleId?: string;
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
  | 'surface_initial_ui_recorded'
  | 'next_frame_checkpoint'
  | 'surface_resolved_recorded'
  | 'surface_live_recorded';

const SAFE_DETAIL_KEYS = new Set([
  'account_generation',
  'cache_age_ms',
  'connection_id',
  'content_variant',
  'context_generation',
  'data_ready_at_demand',
  'demand_id',
  'duration_ms',
  'elapsed_ms',
  'frame_checkpoint_monotonic_ms',
  'frame_boundary',
  'fresh_for_lifecycle',
  'freshness_source',
  'instrumentation_schema',
  'lifecycle',
  'markets_source',
  'orders_source',
  'positions_source',
  'delivery_source',
  'source',
  'success',
  'visible_item_count',
]);

const sanitizeDetail = (detail: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(detail).filter(
      ([key, value]) =>
        SAFE_DETAIL_KEYS.has(key) &&
        (typeof value === 'string' ||
          (typeof value === 'number' && Number.isFinite(value) && value >= 0) ||
          typeof value === 'boolean'),
    ),
  );

let diskCacheTimestampMs: number | null = null;
let firstDemand = true;
let accountGeneration = 0;
let contextGeneration = 0;
let lifecycle: HomepagePerformanceLifecycle = 'cold_no_cache';
let lifecycleStartedAtMonotonicMs = performance.now();
let backgroundStartedAt: number | null = null;
let activeObservationCount = 0;
let pendingAccountBundle:
  | {
      key: string;
      id: string;
      streams: Set<HomepagePerpsStream>;
    }
  | undefined;
const lifecycleListeners = new Set<() => void>();
export const isHomepagePerformanceProbeActive = () =>
  activeObservationCount > 0;

export const activateHomepagePerformanceProbe = () => {
  if (!__DEV__) return () => undefined;
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
      ...sanitizeDetail(detail),
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
  if (!__DEV__) return () => undefined;
  lifecycleListeners.add(listener);
  return () => {
    lifecycleListeners.delete(listener);
  };
};

export const handleHomepagePerformanceAppStateChange = (
  nextState: AppStateStatus,
) => {
  if (!__DEV__) return;
  if (nextState === 'background') {
    backgroundStartedAt ??= performance.now();
    return;
  }
  if (nextState !== 'active' || backgroundStartedAt === null) return;

  const foregroundedAt = performance.now();
  contextGeneration += 1;
  pendingAccountBundle = undefined;
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
  if (!__DEV__) return;
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
  { advancesContext = true }: { advancesContext?: boolean } = {},
) => {
  if (lifecycle === next && !advancesContext) return;
  if (advancesContext) contextGeneration += 1;
  pendingAccountBundle = undefined;
  lifecycle = next;
  lifecycleStartedAtMonotonicMs = performance.now();
  notifyLifecycleChange();
};

export const markHomepagePerpsNavigateReturn = () => {
  if (!__DEV__) return;
  if (
    lifecycle === 'cold_no_cache' ||
    lifecycle === 'cold_disk_cache' ||
    lifecycle === 'navigate_return'
  ) {
    setLifecycle('navigate_return');
  }
};

export const markHomepagePerpsNetworkSwitch = () => {
  if (!__DEV__) return;
  setLifecycle('network_switch', { advancesContext: true });
};

export const markHomepagePerpsAccountSwitch = () => {
  if (!__DEV__) return;
  accountGeneration += 1;
  setLifecycle('account_switch', { advancesContext: true });
};

const getAccountBundleId = (
  stream: HomepagePerpsStream,
  source: HomepagePerpsDeliverySource,
): string | undefined => {
  if (
    (source !== 'provider_snapshot' && source !== 'memory_cache') ||
    (stream !== 'positions' && stream !== 'orders' && stream !== 'account')
  ) {
    return undefined;
  }
  const key = `${accountGeneration}|${contextGeneration}|${source}`;
  if (
    !pendingAccountBundle ||
    pendingAccountBundle.key !== key ||
    pendingAccountBundle.streams.has(stream)
  ) {
    pendingAccountBundle = { key, id: uuidv4(), streams: new Set() };
  }
  pendingAccountBundle.streams.add(stream);
  const bundleId = pendingAccountBundle.id;
  if (pendingAccountBundle.streams.size === 3) {
    pendingAccountBundle = undefined;
  }
  return bundleId;
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
}): HomepagePerpsDeliveryMetadata => {
  const bundleId = getAccountBundleId(stream, source);
  return {
    deliveryId: uuidv4(),
    stream,
    source,
    ...(originSource && { originSource }),
    ...(bundleId && { bundleId }),
    itemCount,
    receivedAtMonotonicMs: performance.now(),
    dataAgeMs,
    lifecycle,
    accountGeneration,
    contextGeneration,
  };
};

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
  const bundleId =
    previousDelivery?.bundleId ?? getAccountBundleId(stream, 'memory_cache');
  return {
    deliveryId: uuidv4(),
    stream,
    source: 'resident_state',
    originSource: previousDelivery?.originSource ?? previousDelivery?.source,
    ...(bundleId && { bundleId }),
    itemCount,
    receivedAtMonotonicMs: previousDelivery?.receivedAtMonotonicMs ?? now,
    residentWrappedAtMonotonicMs: now,
    dataAgeMs: previousDelivery
      ? previousDelivery.dataAgeMs +
        now -
        (previousDelivery.residentWrappedAtMonotonicMs ??
          previousDelivery.receivedAtMonotonicMs)
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

const isDemandCurrent = (demand: HomepagePerformanceDemand) =>
  demand.lifecycle === lifecycle &&
  demand.accountGeneration === accountGeneration &&
  demand.contextGeneration === contextGeneration;

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
    streams.has('positions') && streams.has('orders') && streams.has('account');
  const accountDeliveries = deliveries.filter(
    ({ stream }) =>
      stream === 'positions' || stream === 'orders' || stream === 'account',
  );
  const bundledDeliveries = accountDeliveries.filter(({ bundleId }) =>
    Boolean(bundleId),
  );
  const hasCoherentBundle =
    bundledDeliveries.length === 0 ||
    (bundledDeliveries.length === 3 &&
      new Set(bundledDeliveries.map(({ bundleId }) => bundleId)).size === 1);
  return contentVariant === 'trending' || contentVariant === 'pills'
    ? hasAccountResolution && hasCoherentBundle && streams.has('markets')
    : hasAccountResolution && hasCoherentBundle;
};

const getRequiredDeliveries = (
  deliveries: HomepagePerpsDeliveryMetadata[],
  contentVariant: HomepagePerpsContentVariant,
) => {
  const requiresMarkets =
    contentVariant === 'trending' || contentVariant === 'pills';
  const requiredStreams = new Set<HomepagePerpsStream>([
    'positions',
    'orders',
    'account',
  ]);
  if (requiresMarkets) requiredStreams.add('markets');
  return deliveries.filter(({ stream }) => requiredStreams.has(stream));
};

const getVisibleDeliveries = (
  deliveries: HomepagePerpsDeliveryMetadata[],
  contentVariant: HomepagePerpsContentVariant,
) => getRequiredDeliveries(deliveries, contentVariant);

const hasVisibleStreams = (
  deliveries: HomepagePerpsDeliveryMetadata[],
  contentVariant: HomepagePerpsContentVariant,
) => hasRequiredStreams(deliveries, contentVariant);

const getEffectiveSource = (delivery: HomepagePerpsDeliveryMetadata) =>
  delivery.source === 'resident_state' || delivery.source === 'memory_cache'
    ? (delivery.originSource ?? delivery.source)
    : delivery.source;

export const recordHomepagePerpsVisibleFrame = ({
  demand,
  deliveries,
  contentVariant,
  isConnectionLive = false,
  reactCommitAtMonotonicMs,
  frameCheckpointAtMonotonicMs,
}: {
  demand: HomepagePerformanceDemand;
  deliveries: HomepagePerpsDeliveryMetadata[];
  contentVariant: HomepagePerpsContentVariant;
  isConnectionLive?: boolean;
  reactCommitAtMonotonicMs: number;
  frameCheckpointAtMonotonicMs: number;
}) => {
  if (
    !__DEV__ ||
    !isHomepagePerformanceProbeActive() ||
    !isDemandCurrent(demand) ||
    !Number.isFinite(reactCommitAtMonotonicMs) ||
    !Number.isFinite(frameCheckpointAtMonotonicMs) ||
    reactCommitAtMonotonicMs < demand.startedAtMonotonicMs ||
    frameCheckpointAtMonotonicMs < reactCommitAtMonotonicMs
  ) {
    return;
  }
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
  }

  if (contentVariant === 'trending' || contentVariant === 'pills') {
    return;
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
  if (
    !__DEV__ ||
    !isHomepagePerformanceProbeActive() ||
    !isDemandCurrent(demand) ||
    !Number.isFinite(frameCheckpointAtMonotonicMs) ||
    frameCheckpointAtMonotonicMs < demand.startedAtMonotonicMs
  ) {
    return;
  }
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

export const markHomepagePerformanceDemandComplete = (
  demand: HomepagePerformanceDemand,
) => {
  if (!__DEV__ || !isHomepagePerformanceProbeActive()) return;
  if (!isDemandCurrent(demand)) return;
  setLifecycle('navigate_return');
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
  pendingAccountBundle = undefined;
  lifecycleListeners.clear();
};
