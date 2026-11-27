import { Messenger } from '@metamask/messenger';
import { createUIQueryClient } from '@metamask/react-data-query';
import { CollectiblesSocialApiDataService } from '../../../../app/components/UI/Collectibles/services/data/CollectiblesSocialApiDataService';
import type { CollectiblesSocialApiClient } from '../../../../app/components/UI/Collectibles/services/clients/CollectiblesSocialApiClient';
import type { QueryClient } from '@tanstack/query-core';

/** REAL: service, messenger and UI cache bridge. MOCKED: unavailable Social backend clients. */
export function buildCollectiblesSocialApiDataHarness(
  client: CollectiblesSocialApiClient,
): {
  service: CollectiblesSocialApiDataService;
  ui: QueryClient;
  client: CollectiblesSocialApiClient;
  track: (unsubscribe: () => void) => void;
  destroy: () => void;
} {
  // Let the global fixed unit clock progress with real elapsed time. Preserve
  // its origin for fixture dates; timers and request scheduling stay real.
  const previousNow = Date.now;
  const clockOrigin = previousNow();
  const startedAt = new Date().getTime();
  Date.now = (): number => clockOrigin + new Date().getTime() - startedAt;
  const messenger = new Messenger({
    namespace: 'CollectiblesSocialApiDataService',
  });
  const service = new CollectiblesSocialApiDataService({ messenger, client });
  const ui = createUIQueryClient(
    ['CollectiblesSocialApiDataService'] as const,
    messenger,
    {
      defaultOptions: { queries: { retry: false } },
    },
  );
  const subscriptions: (() => void)[] = [];
  return {
    service,
    ui,
    client,
    track: (unsubscribe): void => {
      subscriptions.push(unsubscribe);
    },
    destroy: (): void => {
      subscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
      ui.clear();
      service.destroy();
      Date.now = previousNow;
    },
  };
}
