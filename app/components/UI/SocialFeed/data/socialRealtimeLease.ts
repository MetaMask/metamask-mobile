import type { SocialFeedRealtimeScope } from '@metamask/social-controllers';
import Engine from '../../../../core/Engine';

/** Whether a lease's scope is subscribed on the socket. */
export type SocialRealtimeLeaseStatus = 'live' | 'unavailable';

export type ReleaseSocialRealtime = () => void;

const leaseCounts = new Map<SocialFeedRealtimeScope, number>();
let syncQueue: Promise<void> = Promise.resolve();

const noop = () => undefined;

/**
 * Applies the scopes every open lease holds. Runs one at a time and reads the
 * counts when it runs, so overlapping acquire and release calls settle on the
 * latest set instead of racing each other.
 */
const syncService = (): Promise<boolean> => {
  const run = syncQueue.then(async () => {
    const service = Engine.context.SocialRealtimeService;
    if (!service) {
      throw new Error('SocialRealtimeService is not available');
    }
    const scopes = [...leaseCounts.keys()];
    if (scopes.length === 0) {
      await service.setActive(false);
      return;
    }
    await service.setScopes(scopes);
    await service.setActive(true);
  });
  syncQueue = run.catch(noop);
  return run.then(
    () => true,
    () => false,
  );
};

/**
 * Shares the single Social feed socket subscription between consumers. Each
 * holder leases a scope; the service follows the union of leased scopes and
 * goes inactive when the last lease is released. Listen for events with
 * `SocialRealtimeService.addListener` and filter on the scope argument.
 *
 * @param scope - Feed channel this holder needs.
 * @param onStatus - Called once the subscription settles, unless released first.
 * @returns Releases the lease. Safe to call more than once.
 */
export const acquireSocialRealtime = (
  scope: SocialFeedRealtimeScope,
  onStatus?: (status: SocialRealtimeLeaseStatus) => void,
): ReleaseSocialRealtime => {
  if (!Engine.context.SocialRealtimeService) {
    onStatus?.('unavailable');
    return noop;
  }

  leaseCounts.set(scope, (leaseCounts.get(scope) ?? 0) + 1);
  let released = false;

  syncService().then((isLive) => {
    if (!released) {
      onStatus?.(isLive ? 'live' : 'unavailable');
    }
  }, noop);

  return () => {
    if (released) {
      return;
    }
    released = true;
    const remaining = (leaseCounts.get(scope) ?? 1) - 1;
    if (remaining > 0) {
      leaseCounts.set(scope, remaining);
    } else {
      leaseCounts.delete(scope);
    }
    syncService().catch(noop);
  };
};

/** Test-only: forget every lease and pending sync. */
export const resetSocialRealtimeLeases = (): void => {
  leaseCounts.clear();
  syncQueue = Promise.resolve();
};
