import type { DataServiceGranularCacheUpdatedPayload } from '@metamask/base-data-service';
import { ExtractActionParameters } from '@metamask/messenger';
import { createUIQueryClient } from '@metamask/react-data-query';

import Engine from './Engine';
import type { GlobalActions } from './Engine/types';
import { DATA_SERVICES } from '../constants/data-services';

console.log('createQueryClient was loaded');
console.log(
  '[createQueryClient] Is Engine mocked?',
  'init' in Engine ? 'no' : 'yes',
);
console.log(
  '[createQueryClient] Is Engine.controllerMessenger.call mocked?',
  'mock' in Engine.controllerMessenger.call ? 'yes' : 'no',
);

type DataServiceName = (typeof DATA_SERVICES)[number];

/**
 * Handles granular cache update events emitted by data services.
 */
type DataServiceGranularCacheUpdatedHandler = (
  payload: DataServiceGranularCacheUpdatedPayload,
) => void;

/**
 * Wraps the root messenger to the messenger adapter shape that
 * `createUIQueryClient` expects.
 *
 * Although `createUIQueryClient` *can* take a messenger, we cannot pass
 * `Engine.controllerMessenger` directly to it. Despite its appearance,
 * `Engine.controllerMessenger` is not a property; it is secretly a method which
 * expects `Engine` to have been completely initialized first. So we need to
 * wrap and thus lazily access the root messenger.
 */
export class RootMessengerAdapter {
  #messenger = Engine.controllerMessenger;

  call(
    actionType: Extract<GlobalActions['type'], `${DataServiceName}:${string}`>,
    ...params: ExtractActionParameters<
      GlobalActions,
      Extract<GlobalActions['type'], `${DataServiceName}:${string}`>
    >
  ): unknown {
    console.log('Calling messenger action:', actionType, params);
    return this.#messenger.call(actionType, ...params);
  }

  subscribe(
    eventType: `${DataServiceName}:cacheUpdated:${string}`,
    handler: DataServiceGranularCacheUpdatedHandler,
  ): void {
    this.#messenger.subscribe(eventType, handler);
  }

  unsubscribe(
    eventType: `${DataServiceName}:cacheUpdated:${string}`,
    handler: DataServiceGranularCacheUpdatedHandler,
  ): void {
    this.#messenger.unsubscribe(eventType, handler);
  }
}

export function createQueryClient(
  options?: Partial<Parameters<typeof createUIQueryClient>[2]>,
) {
  console.log('In createQueryClient, wrapping Engine.controllerMessenger');
  console.log(
    '[createQueryClient] Is Engine STILL mocked?',
    'init' in Engine ? 'no' : 'yes',
  );
  console.log(
    '[createQueryClient] Is Engine.controllerMessenger.call NOW mocked?',
    'mock' in Engine.controllerMessenger.call ? 'yes' : 'no',
  );
  const rootMessengerAdapter = new RootMessengerAdapter();

  return createUIQueryClient(DATA_SERVICES, rootMessengerAdapter, {
    defaultOptions: {
      queries: {
        // Mobile users often trigger re-renders or navigate back/forth frequently.
        staleTime: 1000 * 60 * 5, // 5 minutes
        // On mobile, failures are often due to network drops.
        retry: 2,
        // Keep data in memory for longer.
        cacheTime: 1000 * 60 * 60 * 24, // 24 hours
      },
    },
    ...options,
  });
}
