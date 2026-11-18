/**
 * REAL: PackPartner's Engine messenger factory and StorageService.
 * MOCKED: Disk I/O through the package's InMemoryStorageAdapter.
 * Reuse an adapter across harness instances to model a process restart.
 */
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  InMemoryStorageAdapter,
  StorageService,
  type StorageAdapter,
  type StorageServiceActions,
  type StorageServiceEvents,
} from '@metamask/storage-service';
import { createUIQueryClient } from '@metamask/react-data-query';
import {
  PackPartnerDataService,
  type PackPartnerDataServiceActions,
  type PackPartnerDataServiceEvents,
  type PackPartnerDataServiceMessenger,
} from '../../../../app/components/UI/Collectibles/services/data/PackPartnerDataService';
import { createPackPartnerApi } from '../../../../app/components/UI/Collectibles/services/clients/PackPartnerApiClient';
import { getPackPartnerDataServiceMessenger } from '../../../../app/core/Engine/messengers/collectibles-data-services-messenger';

type ReadActionType = Extract<
  PackPartnerDataServiceActions,
  { type: `PackPartnerDataService:${string}` }
>['type'];

/** Mirrors ReactQueryService's dynamic query-key to typed messenger boundary. */
export const createPackPartnerUIQueryClient = (
  messenger: PackPartnerDataServiceMessenger,
) =>
  createUIQueryClient(['PackPartnerDataService'] as const, {
    call: (method: `PackPartnerDataService:${string}`, ...params: unknown[]) =>
      // @ts-expect-error Query keys supply runtime argument lists, not one action's fixed tuple.
      messenger.call(method as ReadActionType, ...params),
    subscribe: messenger.subscribe.bind(messenger),
    unsubscribe: messenger.unsubscribe.bind(messenger),
  });

export const buildPackPartnerStorageHarness = (
  storage: StorageAdapter = new InMemoryStorageAdapter(),
) => {
  const root = new Messenger<
    MockAnyNamespace,
    PackPartnerDataServiceActions | StorageServiceActions,
    PackPartnerDataServiceEvents | StorageServiceEvents
  >({ namespace: MOCK_ANY_NAMESPACE });
  const storageService = new StorageService({
    messenger: new Messenger({ namespace: 'StorageService', parent: root }),
    storage,
  });
  return {
    messenger: getPackPartnerDataServiceMessenger(root),
    storage,
    storageService,
  };
};

/** Full read path; only HTTP and disk I/O are substituted. */
export const buildPackPartnerPersistenceHarness = (
  storage: StorageAdapter = new InMemoryStorageAdapter(),
) => {
  const harness = buildPackPartnerStorageHarness(storage);
  const fetchMock = jest.fn<
    ReturnType<typeof fetch>,
    Parameters<typeof fetch>
  >();
  const service = new PackPartnerDataService({
    messenger: harness.messenger,
    api: createPackPartnerApi({
      fetch: fetchMock,
      baseUrl: 'https://pack-partner.test/api',
      cardsBaseUrl: 'https://cards.test',
      apiKey: '',
    }),
  });
  const ui = createPackPartnerUIQueryClient(harness.messenger);
  return {
    ...harness,
    service,
    ui,
    fetchMock,
    cleanup: () => {
      ui.clear();
      service.destroy();
    },
  };
};
