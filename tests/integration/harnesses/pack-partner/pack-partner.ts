/**
 * Wires real Engine messenger factories, the controller and service, StorageService
 * and a UI query client. HTTP, Snap execution, signature status and checkpoint
 * writes use test doubles. Await started operations before calling cleanup().
 */
jest.mock('../../../../app/util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

import type { PackPartnerEnvironment } from '../../../../app/components/UI/Collectibles/providers/pack-partner/constants/environment';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { KeyringControllerUnlockEvent } from '@metamask/keyring-controller';
import {
  InMemoryStorageAdapter,
  StorageService,
  type StorageServiceActions,
  type StorageServiceEvents,
} from '@metamask/storage-service';
import type { SnapControllerHandleRequestAction } from '@metamask/snaps-controllers';
import {
  CollectiblesController,
  type CollectiblesControllerActions,
  type CollectiblesControllerEvents,
  type CollectiblesControllerState,
} from '../../../../app/components/UI/Collectibles/controllers/CollectiblesController';
import { PACK_PARTNER_API_URL } from '../../../../app/components/UI/Collectibles/providers/pack-partner/constants/packPartner';
import {
  buybackAvailable,
  machinePokemon50,
  machinePrivate,
  openPackAwarded,
  status,
} from '../../../../app/components/UI/Collectibles/providers/pack-partner/services/api.fixtures';
import { createPackPartnerApi } from '../../../../app/components/UI/Collectibles/services/clients/PackPartnerApiClient';
import {
  PackPartnerDataService,
  type PackPartnerDataServiceActions,
  type PackPartnerDataServiceEvents,
} from '../../../../app/components/UI/Collectibles/services/data/PackPartnerDataService';
import { getCollectiblesControllerMessenger } from '../../../../app/core/Engine/messengers/collectibles-controller-messenger';
import { getPackPartnerDataServiceMessenger } from '../../../../app/core/Engine/messengers/collectibles-data-services-messenger';
import { wireWithMemo } from '../../../../app/components/UI/Collectibles/providers/pack-partner/services/solanaTransaction.fixtures';
import { createPackPartnerUIQueryClient } from './storage';

export const ACCOUNT = {
  id: '3f1c2b7e-8a4d-4c1e-9f0a-2b6d5e7c8a91',
  address: '78ieXfmDY4ZG2t6PzY183YjpmpJkmzThgZHV6ZVxyare',
};
export const PACK = {
  code: 'pokemon_50',
  name: 'Pokemon 50',
  price: 50,
  priceAmount: '50000000',
};
export const MEMO = 'cc-7582548c-cf8c-42cb-b18f-1a8d76749c8a';
export const CARD_MINT = openPackAwarded.nft_address;
export const PURCHASE_TRANSACTION = wireWithMemo(MEMO);
export const SALE_TRANSACTION = wireWithMemo(MEMO, 0);
export const SIGNED_PURCHASE = 'c2lnbmVkLXB1cmNoYXNl';
export const SIGNED_SALE = 'c2lnbmVkLXNhbGU=';

interface HttpResult {
  status?: number;
  body: unknown;
}

type HttpResponder = (
  url: string,
  init?: RequestInit,
) => HttpResult | undefined;

const defaultResponse: HttpResponder = (url, init) => {
  const path = new URL(url).pathname;
  switch (path) {
    case '/api/machines':
      return { body: { machines: [machinePokemon50, machinePrivate] } };
    case '/api/status':
      return { body: status };
    case '/api/generatePack':
      return { body: { memo: MEMO, transaction: PURCHASE_TRANSACTION } };
    case '/api/submitTransaction': {
      const sale =
        init?.body === JSON.stringify({ signedTransaction: SIGNED_SALE });
      return {
        body: {
          success: true,
          signature: sale ? 'sale-signature' : 'purchase-signature',
          confirmationStatus: 'confirmed',
        },
      };
    }
    case '/api/openPack':
      return { body: openPackAwarded };
    case '/api/buyback/available':
      return { body: buybackAvailable };
    case '/api/buyback':
      return {
        body: {
          success: true,
          serializedTransaction: SALE_TRANSACTION,
          refundAmount: buybackAvailable.amount,
          memo: MEMO,
        },
      };
    case '/api/buyback/check':
      return {
        body: {
          exists: true,
          status: 'complete',
          transactionSignature: 'sale-signature',
          buybackAmount: String(buybackAvailable.amount),
        },
      };
    case '/api/getAllWinners':
      return { body: { success: true, data: [] } };
    default:
      if (path.startsWith('/cards/')) {
        return {
          body: {
            nextCursor: null,
            filterNFtCard: [
              {
                nftAddress: CARD_MINT,
                itemName: 'Owned card',
                insuredValue: '50',
              },
            ],
          },
        };
      }
      throw new Error(`Unexpected HTTP request: ${url}`);
  }
};

/** The HTTP client always calls fetch with a URL string. */
export function requestUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input !== 'string')
    throw new Error('Expected a string request URL');
  return input;
}

/** Builds an isolated controller and real services with HTTP and Snap I/O mocks. */
export const buildPackPartnerIntegrationHarness = ({
  respond,
  persist = jest.fn().mockResolvedValue(undefined),
  readSignature = jest.fn().mockResolvedValue('unknown'),
  state,
  now,
}: {
  persist?: (state: unknown) => Promise<void>;
  readSignature?: (
    network: PackPartnerEnvironment,
    signature: string,
  ) => Promise<'confirmed' | 'failed' | 'unknown'>;
  respond?: HttpResponder;
  state?: CollectiblesControllerState;
  now?: () => number;
} = {}) => {
  const messenger = new Messenger<
    MockAnyNamespace,
    | CollectiblesControllerActions
    | SnapControllerHandleRequestAction
    | PackPartnerDataServiceActions
    | StorageServiceActions,
    | CollectiblesControllerEvents
    | PackPartnerDataServiceEvents
    | StorageServiceEvents
    | KeyringControllerUnlockEvent
  >({ namespace: MOCK_ANY_NAMESPACE });
  new StorageService({
    messenger: new Messenger({
      namespace: 'StorageService',
      parent: messenger,
    }),
    storage: new InMemoryStorageAdapter(),
  });
  const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn(
    async (input, init) => {
      const url = requestUrl(input);
      const result = respond?.(url, init) ?? defaultResponse(url, init);
      const code = result?.status ?? 200;
      return {
        ok: code >= 200 && code < 300,
        status: code,
        text: async () => JSON.stringify(result?.body),
      } as Response;
    },
  );
  const snapMock = jest
    .fn<
      ReturnType<SnapControllerHandleRequestAction['handler']>,
      Parameters<SnapControllerHandleRequestAction['handler']>
    >()
    .mockImplementation(async ({ request }) => {
      const params = request.params as { transaction?: unknown } | undefined;
      if (
        request.method === 'signPackPartnerBuy' &&
        typeof params?.transaction === 'string'
      ) {
        return {
          signedTransaction: SIGNED_PURCHASE,
          signature: 'purchase-signature',
        };
      }
      if (
        request.method === 'signPackPartnerBuyback' &&
        params?.transaction === SALE_TRANSACTION
      ) {
        return {
          signedTransaction: SIGNED_SALE,
          signature: 'sale-signature',
        };
      }
      throw new Error(`Unexpected Pack Partner Snap request`);
    });
  messenger.registerActionHandler('SnapController:handleRequest', snapMock);
  const serviceMessenger = getPackPartnerDataServiceMessenger(messenger);
  const readOptions = {
    messenger: serviceMessenger,
    api: createPackPartnerApi({ fetch: fetchMock }),
    now,
  };
  const dataService = new PackPartnerDataService(readOptions);
  const controllerMessenger = getCollectiblesControllerMessenger(messenger);
  const controllerOptions = {
    persist,
    messenger: controllerMessenger,
    // Mirrors Engine init: the workflow has its own uncached client.
    packPartner: {
      readSignature,
      readBlockhashValidity: jest.fn().mockResolvedValue(true),
      api: createPackPartnerApi({ fetch: fetchMock }),
      now,
    },
    state,
  };
  const controller = new CollectiblesController(controllerOptions);
  // What a screen reads through react-data-query: data-service actions, then
  // the `cacheUpdated:<hash>` events of the entries it observes.
  const ui = createPackPartnerUIQueryClient(serviceMessenger);

  // Mirror Engine.resetState: invalidate workflow generations and its server cache together.
  const resetWallet = async () =>
    Promise.all([controller.clearState(), dataService.clearCache()]);

  return {
    messenger,
    controller,
    resetWallet,
    dataService,
    ui,
    fetchMock,
    snapMock,
    apiUrl: PACK_PARTNER_API_URL,
    cleanup: async () => {
      ui.clear();
      await resetWallet();
      dataService.destroy();
      messenger.unregisterActionHandler('SnapController:handleRequest');
      messenger.clearEventSubscriptions('CollectiblesController:stateChanged');
      fetchMock.mockReset();
      snapMock.mockReset();
    },
  };
};
