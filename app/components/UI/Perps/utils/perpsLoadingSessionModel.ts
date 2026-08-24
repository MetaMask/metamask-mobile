export const PERPS_BOOTSTRAP_STAGE = 'perps_bootstrap_start';
export const PERPS_VALUES_READY_STAGE = 'values_ready';
export const PERPS_LOADING_SESSION_TIMEOUT_MS = 90_000;

export type PerpsLoadingStream =
  | 'markets'
  | 'positions'
  | 'orders'
  | 'account'
  | 'prices';

export type PerpsLoadingSource =
  | 'memory_cache'
  | 'disk_cache'
  | 'provider_snapshot'
  | 'terminal_global_snapshot_v2'
  | 'provider'
  | 'fresh_socket';

export const PERPS_LOADING_CACHE_SOURCES: ReadonlySet<PerpsLoadingSource> =
  new Set(['memory_cache', 'disk_cache', 'provider_snapshot']);

export type PerpsSessionMarketSource =
  | 'terminal_v2'
  | 'provider'
  | 'memory_cache'
  | 'disk_cache'
  | 'unknown';

export type PerpsSessionAccountSource =
  | 'provider_snapshot'
  | 'memory_cache'
  | 'disk_cache'
  | 'fresh_socket'
  | 'unknown';

export type PerpsLoadingLifecycle =
  | 'cold_no_cache'
  | 'cold_disk_cache'
  | 'navigate_return'
  | 'background_short'
  | 'background_reconnect'
  | 'account_switch'
  | 'network_switch';

export type PerpsLoadingSurface = 'homepage';

export interface StartPerpsLoadingSessionOptions {
  lifecycle?: PerpsLoadingLifecycle;
  surface?: PerpsLoadingSurface;
  restart?: boolean;
  identity?: PerpsLoadingSessionIdentity;
  provider?: string;
  network?: 'mainnet' | 'testnet';
}

export interface PerpsLoadingSessionIdentity {
  marketKey: string;
  userKey: string;
  accountKey: string;
}

export interface PerpsLoadingSessionContext {
  id: string;
  marketSource: PerpsSessionMarketSource;
  accountSource: PerpsSessionAccountSource;
  lifecycle: PerpsLoadingLifecycle;
  accountGeneration: number;
  contextGeneration: number;
  connectionGeneration?: number;
}

export type PerpsLoadingSessionCancellationReason =
  | 'app_backgrounded'
  | 'context_changed'
  | 'session_restarted'
  | 'surface_unfocused'
  | 'surface_unmounted';

export type PerpsLoadingSessionUpdate =
  | {
      type: 'started' | 'milestone' | 'lifecycle';
      context: PerpsLoadingSessionContext;
    }
  | { type: 'finished'; context: PerpsLoadingSessionContext }
  | {
      type: 'cancelled' | 'timed_out';
      context: PerpsLoadingSessionContext;
    };

export function createPerpsLoadingSessionIdentity({
  address,
  hip3ConfigVersion,
  network,
  provider,
}: {
  address?: string;
  hip3ConfigVersion: number;
  network: 'mainnet' | 'testnet';
  provider?: string;
}): PerpsLoadingSessionIdentity {
  const marketKey = JSON.stringify([
    provider ?? '',
    network,
    hip3ConfigVersion,
  ]);
  const accountKey = address?.toLowerCase() ?? '';
  return {
    marketKey,
    userKey: JSON.stringify([marketKey, accountKey]),
    accountKey,
  };
}

export function resolvePerpsLoadingLifecycle(
  context: 'cold_process' | 'warm' | 'background_resume',
): PerpsLoadingLifecycle {
  if (context === 'warm') {
    return 'navigate_return';
  }
  if (context === 'background_resume') {
    return 'background_short';
  }
  return 'cold_no_cache';
}
