import { QueryCache } from '@tanstack/query-core';
import {
  BaseDataService,
  type DataServiceActions,
  type DataServiceEvents,
} from '@metamask/base-data-service';
import type { Messenger } from '@metamask/messenger';
import type { CollectiblesApiClient } from '../clients/CollectiblesApiClient';

const NAME = 'CollectiblesApiDataService';
export type CollectiblesApiDataServiceActions = DataServiceActions<typeof NAME>;
export type CollectiblesApiDataServiceEvents = DataServiceEvents<typeof NAME>;
export type CollectiblesApiDataServiceMessenger = Messenger<
  typeof NAME,
  CollectiblesApiDataServiceActions,
  CollectiblesApiDataServiceEvents
>;

/** Engine-owned service for Collectibles API reads. */
export class CollectiblesApiDataService extends BaseDataService<
  typeof NAME,
  CollectiblesApiDataServiceMessenger
> {
  readonly #cache: QueryCache;

  protected readonly client: CollectiblesApiClient;

  constructor({
    messenger,
    client,
  }: {
    messenger: CollectiblesApiDataServiceMessenger;
    client: CollectiblesApiClient;
  }) {
    const cache = new QueryCache();
    super({ name: NAME, messenger, queryClientConfig: { queryCache: cache } });
    this.#cache = cache;
    this.client = client;
  }

  /** Clears this service’s wallet data before Engine tears down the messenger. */
  clearCache(): void {
    this.#cache.clear();
  }
}
