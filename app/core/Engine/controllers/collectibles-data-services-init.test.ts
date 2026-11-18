import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type ActionConstraint,
  type EventConstraint,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { create } from '@metamask/superstruct';
import {
  InMemoryStorageAdapter,
  StorageService,
  type StorageServiceActions,
  type StorageServiceEvents,
} from '@metamask/storage-service';
import { PACK_PARTNER_ENVIRONMENT } from '../../../components/UI/Collectibles/providers/pack-partner/constants/environment';
import { PpWinnerStruct } from '../../../components/UI/Collectibles/providers/pack-partner/schemas/packPartner';
import { recentOpening } from '../../../components/UI/Collectibles/providers/pack-partner/services/api.fixtures';
import {
  createPackPartnerApi,
  type PackPartnerApi,
} from '../../../components/UI/Collectibles/services/clients/PackPartnerApiClient';
import type { CollectiblesOpening } from '../../../components/UI/Collectibles/types/collectibles';
import {
  PackPartnerDataService,
  type PackPartnerDataServiceActions,
  type PackPartnerDataServiceEvents,
} from '../../../components/UI/Collectibles/services/data/PackPartnerDataService';
import { packPartnerQueries } from '../../../components/UI/Collectibles/services/data/packPartnerQueries';
import { getPackPartnerDataServiceMessenger } from '../messengers/collectibles-data-services-messenger';
import type { RootExtendedMessenger } from '../types';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { packPartnerDataServiceInit } from './collectibles-data-services-init';

jest.mock(
  '../../../components/UI/Collectibles/services/clients/PackPartnerApiClient',
  () => ({
    ...jest.requireActual(
      '../../../components/UI/Collectibles/services/clients/PackPartnerApiClient',
    ),
    createPackPartnerApi: jest.fn(),
  }),
);

const ADDRESS = 'So1anaWa11etAddre55';

const createApi = (): jest.Mocked<PackPartnerApi> => ({
  getRecentOpenings: jest.fn(),
  getInventory: jest.fn(),
  getMachines: jest.fn(),
  getStatus: jest.fn(),
  generatePack: jest.fn(),
  generatePacks: jest.fn(),
  submitTransaction: jest.fn(),
  openPack: jest.fn(),
  getPackStatus: jest.fn(),
  getBuybackAvailability: jest.fn(),
  createBuyback: jest.fn(),
  checkBuyback: jest.fn(),
  getWalletCards: jest.fn(),
});

const buildRequest = <
  Actions extends ActionConstraint,
  Events extends EventConstraint,
>(
  rootMessenger: Messenger<MockAnyNamespace, Actions, Events>,
) =>
  buildMessengerClientInitRequestMock(
    rootMessenger as unknown as RootExtendedMessenger,
  );

describe('packPartnerDataServiceInit', () => {
  const destroyables: { destroy: () => void }[] = [];

  afterEach(() => {
    destroyables.splice(0).forEach((service) => service.destroy());
    jest.clearAllMocks();
  });

  it('creates the data service with its own PackPartner client', () => {
    const api = createApi();
    jest.mocked(createPackPartnerApi).mockReturnValue(api);
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      PackPartnerDataServiceActions | StorageServiceActions,
      PackPartnerDataServiceEvents | StorageServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    new StorageService({
      storage: new InMemoryStorageAdapter(),
      messenger: new Messenger({
        namespace: 'StorageService',
        parent: rootMessenger,
      }),
    });
    const request = {
      ...buildRequest(rootMessenger),
      controllerMessenger: getPackPartnerDataServiceMessenger(rootMessenger),
    };

    const { controller } = packPartnerDataServiceInit(request);
    destroyables.push(controller);

    expect(controller).toBeInstanceOf(PackPartnerDataService);
    expect(createPackPartnerApi).toHaveBeenCalledTimes(1);
    expect(createPackPartnerApi).toHaveBeenCalledWith();
  });

  it('serves owned cards on the Engine root messenger through the injected client', async () => {
    const api = createApi();
    api.getWalletCards.mockResolvedValue([
      { nftAddress: 'owned-mint', itemName: 'Owned card' },
    ]);
    jest.mocked(createPackPartnerApi).mockReturnValue(api);
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      PackPartnerDataServiceActions | StorageServiceActions,
      PackPartnerDataServiceEvents | StorageServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    new StorageService({
      storage: new InMemoryStorageAdapter(),
      messenger: new Messenger({
        namespace: 'StorageService',
        parent: rootMessenger,
      }),
    });
    const request = {
      ...buildRequest(rootMessenger),
      controllerMessenger: getPackPartnerDataServiceMessenger(rootMessenger),
    };
    const { controller } = packPartnerDataServiceInit(request);
    destroyables.push(controller);

    const cards = await rootMessenger.call(
      'PackPartnerDataService:getOwnedCards',
      PACK_PARTNER_ENVIRONMENT,
      ADDRESS,
    );

    expect(cards).toEqual([
      expect.objectContaining({
        mint: 'owned-mint',
        name: 'Owned card',
        buyback: { status: 'unknown' },
      }),
    ]);
    expect(api.getWalletCards).toHaveBeenCalledWith(
      { address: ADDRESS },
      { signal: expect.any(Object) },
    );
    expect(api.getBuybackAvailability).not.toHaveBeenCalled();
  });

  it('exposes invalidateQueries on the Engine root messenger', async () => {
    const api = createApi();
    api.getWalletCards.mockResolvedValue([]);
    jest.mocked(createPackPartnerApi).mockReturnValue(api);
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      PackPartnerDataServiceActions | StorageServiceActions,
      PackPartnerDataServiceEvents | StorageServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    new StorageService({
      storage: new InMemoryStorageAdapter(),
      messenger: new Messenger({
        namespace: 'StorageService',
        parent: rootMessenger,
      }),
    });
    const request = {
      ...buildRequest(rootMessenger),
      controllerMessenger: getPackPartnerDataServiceMessenger(rootMessenger),
    };
    const { controller } = packPartnerDataServiceInit(request);
    destroyables.push(controller);
    await rootMessenger.call(
      'PackPartnerDataService:getOwnedCards',
      PACK_PARTNER_ENVIRONMENT,
      ADDRESS,
    );

    await rootMessenger.call('PackPartnerDataService:invalidateQueries', {
      queryKey: [
        'PackPartnerDataService:getOwnedCards',
        PACK_PARTNER_ENVIRONMENT,
        ADDRESS,
      ],
    });

    expect(api.getWalletCards).toHaveBeenCalledTimes(2);
  });
});
