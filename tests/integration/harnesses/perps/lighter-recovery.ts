/**
 * Lighter recovery integration harness.
 *
 * REAL: installed Core PerpsController, Mobile messenger delegation,
 * LighterProvider, wallet/client services, response validation and session fences.
 * MOCKED: venue HTTP, keyring state/signing, signer WASM, disk storage and
 * observability. WebSocket/native UI are outside this read-action boundary.
 * No provider, recovery action or controller method is replaced.
 *
 * Usage: buildLighterRecoveryHarness(), then controller.reviewRecoveryVenue().
 */
import {
  PerpsController,
  type PerpsControllerMessenger,
  type LighterSignerBridge,
  type LighterWasmCall,
} from '@metamask/perps-controller';
import {
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { ExtendedMessenger } from '../../../../app/core/ExtendedMessenger';
import { getPerpsControllerMessenger } from '../../../../app/core/Engine/messengers/perps-controller-messenger';
import {
  createMockEvmAccount,
  createMockInfrastructure,
} from '../../../../app/components/UI/Perps/__mocks__/serviceMocks';

const WALLET_ADDRESS: `0x${string}` =
  '0x1234567890abcdef1234567890abcdef12345678';
const PUBLIC_KEY = '9c'.repeat(40);
const ACCOUNT_INDEX = 28;
const API_KEY_INDEX = 2;

/** Builds real controller recovery reads with explicit external I/O boundaries. */
export function buildLighterRecoveryHarness() {
  let selectedAccount: InternalAccount = {
    ...createMockEvmAccount(),
    scopes: ['eip155:1'],
  };
  const disk = new Map<string, string>();
  const responses = new Map<string, unknown>();
  const requests: URL[] = [];
  const accountFixture = {
    code: 0,
    accountType: 0,
    index: ACCOUNT_INDEX,
    l1Address: selectedAccount.address,
    cancelAllTime: 0,
    totalOrderCount: 0,
    pendingOrderCount: 0,
    status: 1,
    collateral: '10000',
    availableBalance: '10000',
    positions: [],
  };
  const infrastructure = createMockInfrastructure();
  infrastructure.diskCache = {
    getItem: jest.fn(async (key: string) => disk.get(key) ?? null),
    getItemSync: jest.fn((key: string) => disk.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      disk.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      disk.delete(key);
    }),
  };

  const createClient = jest
    .fn<
      ReturnType<LighterSignerBridge['createClient']>,
      Parameters<LighterSignerBridge['createClient']>
    >()
    .mockResolvedValue({
      success: true,
      pk: PUBLIC_KEY,
      pubKeySuccess: true,
      body: 'Synthetic registration fixture; must never be submitted',
    });
  const execute = jest.fn((async (call: LighterWasmCall) => {
    if (call.function !== '_createAuthToken') {
      throw new Error('Recovery reads must not sign financial transactions');
    }
    return {
      token: 'synthetic-read-auth',
      deadline: Math.floor(Date.now() / 1000) + 600,
    };
  }) as LighterSignerBridge['execute']);
  const bridge: LighterSignerBridge = {
    createClient,
    execute,
    getRecoverableKeyIndices: async ({ apiKeyIndices }) =>
      apiKeyIndices.filter((slot) => slot === API_KEY_INDEX),
  };
  const rootMessenger = new ExtendedMessenger<
    MockAnyNamespace,
    MessengerActions<PerpsControllerMessenger>,
    MessengerEvents<PerpsControllerMessenger>
  >({ namespace: MOCK_ANY_NAMESPACE });
  const signPersonalMessage = jest
    .fn()
    .mockRejectedValue(
      new Error('Recovery review must not register a venue key'),
    );
  rootMessenger.registerActionHandler(
    'AccountsController:getSelectedAccount',
    jest.fn(() => selectedAccount),
  );
  rootMessenger.registerActionHandler(
    'AccountTreeController:getAccountsFromSelectedAccountGroup',
    jest.fn(() => [selectedAccount]),
  );
  rootMessenger.registerActionHandler(
    'KeyringController:getState',
    jest.fn(() => ({ isUnlocked: true, keyrings: [] })),
  );
  rootMessenger.registerActionHandler(
    'KeyringController:signPersonalMessage',
    signPersonalMessage,
  );
  rootMessenger.registerActionHandler(
    'RemoteFeatureFlagController:getState',
    jest.fn(() => ({ remoteFeatureFlags: {}, cacheTimestamp: 0 })),
  );
  rootMessenger.registerActionHandler(
    'AuthenticatedUserStorageService:getNotificationPreferences',
    jest.fn(async () => null),
  );

  const fetchMock = jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (input) => {
      const url = new URL(String(input));
      requests.push(url);
      if (responses.has(url.pathname)) {
        return new Response(JSON.stringify(await responses.get(url.pathname)), {
          status: 200,
        });
      }
      const account = { ...accountFixture, l1Address: selectedAccount.address };
      let payload: unknown;
      switch (url.pathname) {
        case '/api/v1/accountsByL1Address':
          payload = {
            code: 200,
            l1Address: selectedAccount.address,
            subAccounts: [account],
          };
          break;
        case '/api/v1/account':
          payload = { code: 200, accounts: [account] };
          break;
        case '/api/v1/apikeys':
          payload = {
            code: 200,
            apiKeys: [
              {
                accountIndex: ACCOUNT_INDEX,
                apiKeyIndex: API_KEY_INDEX,
                nonce: 0,
                publicKey: PUBLIC_KEY,
              },
            ],
          };
          break;
        case '/api/v1/nextNonce':
          payload = { code: 200, nonce: 0 };
          break;
        case '/api/v1/orderBookDetails':
          payload = { code: 200, orderBookDetails: [] };
          break;
        case '/api/v1/accountActiveOrders':
          payload = { code: 200, orders: [] };
          break;
        default:
          throw new Error(
            `Unconfigured integration HTTP endpoint: ${url.pathname}`,
          );
      }
      return new Response(JSON.stringify(payload), { status: 200 });
    });
  const controller = new PerpsController({
    messenger: getPerpsControllerMessenger(rootMessenger),
    state: { activeProvider: 'lighter', isTestnet: true, isEligible: true },
    infrastructure,
    clientConfig: {
      providerCredentials: { lighter: { enabled: true, signerBridge: bridge } },
    },
    deferEligibilityCheck: true,
  });

  return {
    controller,
    requests,
    responses,
    accountFixture,
    mocks: { createClient, execute, signPersonalMessage },
    selectAccount: (address: `0x${string}`) => {
      selectedAccount = { ...selectedAccount, address };
      rootMessenger.publish(
        'AccountsController:selectedAccountChange',
        selectedAccount,
      );
    },
    teardown: async () => {
      await controller.disconnect();
      fetchMock.mockRestore();
    },
    walletAddress: WALLET_ADDRESS,
    accountIndex: ACCOUNT_INDEX,
    apiKeyIndex: API_KEY_INDEX,
  };
}
