import { QueryCache } from '@tanstack/query-core';
import {
  BaseDataService,
  type DataServiceActions,
  type DataServiceEvents,
} from '@metamask/base-data-service';
import type { Messenger } from '@metamask/messenger';
import type { CollectiblesSocialApiClient } from '../clients/CollectiblesSocialApiClient';

const NAME = 'CollectiblesSocialApiDataService';
export type CollectiblesSocialApiDataServiceActions = DataServiceActions<
  typeof NAME
>;
export type CollectiblesSocialApiDataServiceEvents = DataServiceEvents<
  typeof NAME
>;
export type CollectiblesSocialApiDataServiceMessenger = Messenger<
  typeof NAME,
  CollectiblesSocialApiDataServiceActions,
  CollectiblesSocialApiDataServiceEvents
>;

/** Engine-owned service for Social API reads. */
export class CollectiblesSocialApiDataService extends BaseDataService<
  typeof NAME,
  CollectiblesSocialApiDataServiceMessenger
> {
  readonly #cache: QueryCache;

  protected readonly client: CollectiblesSocialApiClient;

  constructor({
    messenger,
    client,
  }: {
    messenger: CollectiblesSocialApiDataServiceMessenger;
    client: CollectiblesSocialApiClient;
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
