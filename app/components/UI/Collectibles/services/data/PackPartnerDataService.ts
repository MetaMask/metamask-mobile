import { QueryCache } from '@tanstack/query-core';
import {
  BaseDataService,
  type DataServiceActions,
  type DataServiceEvents,
} from '@metamask/base-data-service';
import type { Messenger } from '@metamask/messenger';
import type {
  StorageServiceGetItemAction,
  StorageServiceSetItemAction,
  StorageServiceClearAction,
} from '@metamask/storage-service';
import type { PackPartnerApi } from '../clients/PackPartnerApiClient';

const NAME = 'PackPartnerDataService';
export type PackPartnerDataServiceActions =
  | DataServiceActions<typeof NAME>
  | StorageServiceGetItemAction
  | StorageServiceSetItemAction
  | StorageServiceClearAction;
export type PackPartnerDataServiceEvents = DataServiceEvents<typeof NAME>;
export type PackPartnerDataServiceMessenger = Messenger<
  typeof NAME,
  PackPartnerDataServiceActions,
  PackPartnerDataServiceEvents
>;

/** Engine-owned service for Pack Partner reads. */
export class PackPartnerDataService extends BaseDataService<
  typeof NAME,
  PackPartnerDataServiceMessenger
> {
  readonly #cache: QueryCache;

  protected readonly api: PackPartnerApi;

  constructor({
    messenger,
    api,
  }: {
    messenger: PackPartnerDataServiceMessenger;
    api: PackPartnerApi;
  }) {
    const cache = new QueryCache();
    super({ name: NAME, messenger, queryClientConfig: { queryCache: cache } });
    this.#cache = cache;
    this.api = api;
  }

  /** Clears this service’s wallet data before Engine tears down the messenger. */
  async clearCache(): Promise<void> {
    this.#cache.clear();
    await this.messenger.call('StorageService:clear', this.name);
  }
}
