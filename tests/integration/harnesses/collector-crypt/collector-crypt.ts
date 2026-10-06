/**
 * CollectorCrypt integration harness.
 * REAL: Engine messenger factory, GachaController, CollectorCryptProvider, API clients, response schemas,
 * transaction adapter and collection reconciliation.
 * MOCKED: HTTP fetch, Snap execution and error logging I/O.
 * USAGE: buildCollectorCryptIntegrationHarness({ respond?, state?, now? });
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
import type { SnapControllerHandleRequestAction } from '@metamask/snaps-controllers';
import {
  GachaController,
  type GachaControllerActions,
  type GachaControllerEvents,
  type GachaControllerState,
} from '../../../../app/components/UI/Gacha/controllers/GachaController';
import { COLLECTOR_CRYPT_API_URL } from '../../../../app/components/UI/Gacha/providers/collector-crypt/constants';
import {
  buybackAvailable,
  machinePokemon50,
  machinePrivate,
  nftApiCoreItem,
  openPackAwarded,
  status,
} from '../../../../app/components/UI/Gacha/providers/collector-crypt/services/api.fixtures';
import { createCollectorCryptApi } from '../../../../app/components/UI/Gacha/providers/collector-crypt/services/collectorCryptApi';
import {
  createSolanaNftApi,
  SOLANA_NFT_API_URL,
} from '../../../../app/components/UI/Gacha/services/solanaNftApi';
import { getGachaControllerMessenger } from '../../../../app/core/Engine/messengers/gacha-controller-messenger';

export const ACCOUNT = {
  id: '3f1c2b7e-8a4d-4c1e-9f0a-2b6d5e7c8a91',
  address: '78ieXfmDY4ZG2t6PzY183YjpmpJkmzThgZHV6ZVxyare',
};
export const PACK = { code: 'pokemon_50', name: 'Pokemon 50', price: 50 };
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
    default:
      if (url.startsWith(SOLANA_NFT_API_URL)) {
        return {
          body: {
            items: [{ ...nftApiCoreItem, token_address: CARD_MINT }],
            cursor: null,
          },
        };
      }
      if (path.startsWith('/cards/')) {
        return { body: { filterNFtCard: [] } };
      }
      throw new Error(`Unexpected HTTP request: ${url}`);
  }
};

/** Builds an isolated controller and real services with HTTP and Snap I/O mocks. */
export const buildCollectorCryptIntegrationHarness = ({
  respond,
  state,
  now,
}: {
  respond?: HttpResponder;
  state?: GachaControllerState;
  now?: () => number;
} = {}) => {
  const messenger = new Messenger<
    MockAnyNamespace,
    GachaControllerActions | SnapControllerHandleRequestAction,
    GachaControllerEvents
  >({ namespace: MOCK_ANY_NAMESPACE });
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
      const sale = JSON.stringify(request.params).includes(SALE_TRANSACTION);
      return {
        signedTransaction: sale ? SIGNED_SALE : SIGNED_PURCHASE,
        signature: sale ? 'sale-signature' : 'purchase-signature',
      };
    });
  messenger.registerActionHandler('SnapController:handleRequest', snapMock);
  const controller = new GachaController({
    messenger: getGachaControllerMessenger(messenger),
    collectorCrypt: {
      api: createCollectorCryptApi({ fetch: fetchMock }),
      nftApi: createSolanaNftApi({ fetch: fetchMock }),
      now,
    },
    state,
  });

  return {
    messenger,
    controller,
    fetchMock,
    snapMock,
    apiUrl: COLLECTOR_CRYPT_API_URL,
    cleanup: () => {
      controller.clearState();
      messenger.unregisterActionHandler('SnapController:handleRequest');
      messenger.clearEventSubscriptions('GachaController:stateChanged');
      fetchMock.mockReset();
      snapMock.mockReset();
    },
  };
};
