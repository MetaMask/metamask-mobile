/**
 * PackPartner integration harness.
 * REAL: Engine messenger factories (Collectibles controller: Snap request, data-service invalidation and wallet unlock
 * delegation), CollectiblesController, PackPartnerProvider, two
 * PackPartner API clients (the uncached workflow client and the data-service client), response schemas,
 * PackPartnerDataService (owned cards, offers, catalogue, openings), StorageService and refresh after workflow outcomes,
 * and a UI query client fed by the data-service cache events.
 * MOCKED: HTTP fetch (one mock shared by both clients),
 * Snap execution, disk I/O (InMemoryStorageAdapter) and error logging I/O.
 * USAGE: buildPackPartnerIntegrationHarness({ respond?, state?, now? });
 * publish `KeyringController:unlock` on `messenger` to resume a restored journal;
 * settle started operations, then call cleanup() after each test.
 */
jest.mock('../../../../app/util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

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
import {
  PACK_PARTNER_API_URL,
  PACK_PARTNER_ENVIRONMENT,
} from '../../../../app/components/UI/Collectibles/providers/pack-partner/constants';
import {
  buybackAvailable,
  machinePokemon50,
  machinePrivate,
  openPackAwarded,
  status,
} from '../../../../app/components/UI/Collectibles/providers/pack-partner/services/api.fixtures';
import { createPackPartnerApi } from '../../../../app/components/UI/Collectibles/services/clients/PackPartnerApiClient';
import type { CollectiblesPackRef } from '../../../../app/components/UI/Collectibles/types';
import { packPartnerQueries } from '../../../../app/components/UI/Collectibles/services/data/packPartnerQueries';
import {
  PackPartnerDataService,
  type PackPartnerDataServiceActions,
  type PackPartnerDataServiceEvents,
} from '../../../../app/components/UI/Collectibles/services/data/PackPartnerDataService';
import { getCollectiblesControllerMessenger } from '../../../../app/core/Engine/messengers/collectibles-controller-messenger';
import { getPackPartnerDataServiceMessenger } from '../../../../app/core/Engine/messengers/collectibles-data-services-messenger';
import { createPackPartnerUIQueryClient } from './storage';

export const ACCOUNT = {
  id: '3f1c2b7e-8a4d-4c1e-9f0a-2b6d5e7c8a91',
  address: '78ieXfmDY4ZG2t6PzY183YjpmpJkmzThgZHV6ZVxyare',
};
export const PACK: CollectiblesPackRef = {
  code: 'pokemon_50',
  name: 'Pokemon 50',
  price: 50,
  priceAmount: '50000000',
};
export const MEMO = 'cc-7582548c-cf8c-42cb-b18f-1a8d76749c8a';
export const CARD_MINT = openPackAwarded.nft_address;
export const PURCHASE_TRANSACTION = 'cHVyY2hhc2UtdHJhbnNhY3Rpb24=';
export const SALE_TRANSACTION = 'c2FsZS10cmFuc2FjdGlvbg==';
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

/** Builds an isolated controller and real services with HTTP and Snap I/O mocks. */
export const buildPackPartnerIntegrationHarness = ({
  respond,
  state,
  now,
}: {
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
      const url = String(input);
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
        params?.transaction === PURCHASE_TRANSACTION
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
      throw new Error(`Unexpected Pack Partner Snap method: ${request.method}`);
    });
  messenger.registerActionHandler('SnapController:handleRequest', snapMock);
  const serviceMessenger = getPackPartnerDataServiceMessenger(messenger);
  const dataService = new PackPartnerDataService({
    messenger: serviceMessenger,
    api: createPackPartnerApi({ fetch: fetchMock }),
    now,
  });
  const controllerMessenger = getCollectiblesControllerMessenger(messenger);
  const controller = new CollectiblesController({
    messenger: controllerMessenger,
    // Mirrors Engine init: the workflow has its own uncached client.
    packPartner: {
      api: createPackPartnerApi({ fetch: fetchMock }),
      now,
    },
    state,
  });
  // What a screen reads through react-data-query: data-service actions, then
  // the `cacheUpdated:<hash>` events of the entries it observes.
  const ui = createPackPartnerUIQueryClient(serviceMessenger);

  // Mirror Engine.resetState: invalidate workflow generations and its server cache together.
  const resetWallet = () => {
    controller.clearState();
    return dataService.clearCache();
  };

  return {
    messenger,
    controller,
    resetWallet,
    dataService,
    ui,
    fetchMock,
    snapMock,
    apiUrl: PACK_PARTNER_API_URL,
    cleanup: () => {
      ui.clear();
      void resetWallet();
      dataService.destroy();
      messenger.unregisterActionHandler('SnapController:handleRequest');
      messenger.clearEventSubscriptions('CollectiblesController:stateChanged');
      fetchMock.mockReset();
      snapMock.mockReset();
    },
  };
};
