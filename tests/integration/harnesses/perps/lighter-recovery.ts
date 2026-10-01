/**
 * Lighter recovery integration harness.
 *
 * REAL: installed Core PerpsController, Mobile messenger delegation,
 * LighterProvider, wallet/client services, response validation and session fences.
 * MOCKED: venue HTTP, keyring state/signing, signer WASM, disk storage and
 * observability. The default read mode refuses all financial signer calls.
 * Explicit isolated-write mode adds a stateful mocked HTTP trigger venue;
 * mutations apply only when that mocked venue accepts the signed submission.
 * WebSocket/native UI are outside this boundary.
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
import Engine from '../../../../app/core/Engine';
import { ExtendedMessenger } from '../../../../app/core/ExtendedMessenger';
import { getPerpsControllerMessenger } from '../../../../app/core/Engine/messengers/perps-controller-messenger';
import {
  createMockEvmAccount,
  createMockInfrastructure,
} from '../../../../app/components/UI/Perps/__mocks__/serviceMocks';

jest.mock('../../../../app/core/Engine', () => ({
  __esModule: true,
  default: { context: { PerpsController: undefined } },
}));

const WALLET_ADDRESS: `0x${string}` =
  '0x1234567890abcdef1234567890abcdef12345678';
const PUBLIC_KEY = '9c'.repeat(40);
const ACCOUNT_INDEX = 28;
const API_KEY_INDEX = 2;

interface RecoveryTrigger {
  orderIndex: number;
  clientOrderIndex: number;
  marketIndex: number;
  ownerAccountIndex: number;
  initialBaseAmount: string;
  remainingBaseAmount: string;
  price: string;
  isAsk: boolean;
  type: string;
  timeInForce: string;
  reduceOnly: number;
  status: string;
  orderExpiry: number;
  timestamp: number;
  triggerPrice: string;
  toCancelOrderId0?: string;
}

const createPositionFixture = () => ({
  marketId: 1,
  symbol: 'BTC',
  initialMarginFraction: '20',
  openOrderCount: 0,
  sign: 1,
  position: '0.1',
  avgEntryPrice: '100000',
  positionValue: '10000',
  unrealizedPnl: '500',
  realizedPnl: '0',
  liquidationPrice: '80000',
});

interface RecoveryVenue {
  positions: ReturnType<typeof createPositionFixture>[];
  active: RecoveryTrigger[];
  inactive: RecoveryTrigger[];
  nonce: number;
  nextOrderIndex: number;
  submission: 'settle' | 'unknown';
  transactions: Map<string, { nonce: number; status: number }>;
}

interface RecoveryHarnessOptions {
  mode?: 'read' | 'isolated-write';
  disk?: Map<string, string>;
  venue?: RecoveryVenue;
}

const MARKET_FIXTURE = {
  symbol: 'BTC',
  marketId: 1,
  marketType: 'perp',
  status: 'active',
  takerFee: '0.0000',
  makerFee: '0.0000',
  minBaseAmount: '0.00020',
  minQuoteAmount: '10.000000',
  supportedSizeDecimals: 5,
  supportedPriceDecimals: 1,
  supportedQuoteDecimals: 6,
  lastTradePrice: 100000,
  dailyTradesCount: 10,
  dailyBaseTokenVolume: 1,
  dailyQuoteTokenVolume: 100000,
  dailyPriceLow: 99000,
  dailyPriceHigh: 101000,
  dailyPriceChange: 1,
  openInterest: 1000000,
  dailyChart: {},
  minInitialMarginFraction: 200,
  maintenanceMarginFraction: 120,
};

/**
 * Builds real controller recovery with explicit external I/O boundaries.
 * The parked-source, market and trigger shapes follow the installed Core
 * LighterProvider selected durable protection fixtures. Only isolated-write
 * mode admits synthetic create/grouped-create/cancel signing and HTTP.
 *
 * @param options - Explicit write mode and optional persistent I/O fixtures.
 * @returns Real controller, I/O fixtures, app-shell binding and teardown.
 */
export function buildLighterRecoveryHarness(
  options: RecoveryHarnessOptions = {},
) {
  const mode = options.mode ?? 'read';
  let selectedAccount: InternalAccount = {
    ...createMockEvmAccount(),
    scopes: ['eip155:1'],
  };
  const disk = options.disk ?? new Map<string, string>();
  const venue: RecoveryVenue = options.venue ?? {
    positions: mode === 'isolated-write' ? [createPositionFixture()] : [],
    active: [],
    inactive: [],
    nonce: 0,
    nextOrderIndex: 9000,
    submission: 'settle',
    transactions: new Map(),
  };
  const signedTransactions = new Map<
    string,
    { txHash: string; call: LighterWasmCall; nonce: number }
  >();
  const submissions: { txType: number; txHash: string; nonce: number }[] = [];
  const storageWrites: { key: string; value: string }[] = [];
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
    positions: venue.positions,
  };
  const infrastructure = createMockInfrastructure();
  infrastructure.diskCache = {
    getItem: jest.fn(async (key: string) => disk.get(key) ?? null),
    getItemSync: jest.fn((key: string) => disk.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      storageWrites.push({ key, value });
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
  let signedSequence = 0;
  const execute = jest.fn((async (call: LighterWasmCall) => {
    if (call.function === '_createAuthToken') {
      return {
        token: 'synthetic-read-auth',
        deadline: Math.floor(Date.now() / 1000) + 600,
      };
    }
    if (mode !== 'isolated-write') {
      throw new Error('Recovery reads must not sign financial transactions');
    }
    const orderExpiry = (value: string | number) =>
      Number(value) === -1
        ? Date.now() + 28 * 24 * 60 * 60 * 1000
        : Number(value);
    let orderIdentity: object;
    switch (call.function) {
      case '_signCreateOrder':
        orderIdentity = {
          ClientOrderIndex: Number(call.params[2]),
          OrderExpiry: orderExpiry(call.params[10]),
        };
        break;
      case '_signCreateGroupedOrders':
        orderIdentity = {
          Orders: Array.from(
            { length: Number(call.params[2]) },
            (_, index) => ({
              ClientOrderIndex: Number(call.params[4 + index * 10]),
              OrderExpiry: orderExpiry(call.params[12 + index * 10]),
            }),
          ),
        };
        break;
      case '_signCancelOrder':
        orderIdentity = {};
        break;
      default:
        throw new Error(
          `Unconfigured isolated signer operation: ${call.function}`,
        );
    }
    signedSequence += 1;
    const nonce = Number(call.params.at(-1));
    const txInfo = JSON.stringify({
      ...orderIdentity,
      Nonce: nonce,
      ExpiredAt: Date.now() + 599_000,
    });
    const txHash = `aaaa${String(signedSequence).padStart(12, '0')}`;
    signedTransactions.set(txInfo, { txHash, call, nonce });
    return { txInfo, txHash };
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
    .mockImplementation(async (input, init) => {
      const url = new URL(String(input));
      requests.push(url);
      if (url.pathname !== '/api/v1/sendTx' && responses.has(url.pathname)) {
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
          payload = { code: 200, nonce: venue.nonce };
          break;
        case '/api/v1/orderBookDetails':
          payload = {
            code: 200,
            orderBookDetails: mode === 'isolated-write' ? [MARKET_FIXTURE] : [],
          };
          break;
        case '/api/v1/orderBooks':
          if (mode !== 'isolated-write') {
            throw new Error('Recovery read harness has no trading markets');
          }
          payload = { code: 200, orderBooks: [MARKET_FIXTURE] };
          break;
        case '/api/v1/accountActiveOrders':
          payload = { code: 200, orders: venue.active };
          break;
        case '/api/v1/accountInactiveOrders':
          if (mode !== 'isolated-write') {
            throw new Error(
              'Recovery reads must not reconcile financial history',
            );
          }
          payload = { code: 200, orders: venue.inactive };
          break;
        case '/api/v1/tx': {
          if (mode !== 'isolated-write') {
            throw new Error('Recovery read harness has no transaction fixture');
          }
          const hash = url.searchParams.get('value') ?? '';
          const transaction = venue.transactions.get(hash);
          payload = transaction
            ? {
                code: 200,
                hash,
                accountIndex: ACCOUNT_INDEX,
                apiKeyIndex: API_KEY_INDEX,
                ...transaction,
              }
            : { code: 21500, message: 'Synthetic venue: unknown transaction' };
          break;
        }
        case '/api/v1/sendTx': {
          if (mode !== 'isolated-write') {
            throw new Error(
              'Recovery reads must not submit financial transactions',
            );
          }
          const form = new URLSearchParams(String(init?.body ?? ''));
          const txType = Number(form.get('tx_type'));
          const signed = signedTransactions.get(form.get('tx_info') ?? '');
          if (!signed || init?.method !== 'POST') {
            throw new Error(
              'Synthetic venue received an unknown signed submission',
            );
          }
          const { call, txHash, nonce } = signed;
          submissions.push({ txType, txHash, nonce });
          if (venue.submission === 'unknown') {
            throw new Error(
              'Synthetic venue transport uncertainty before acceptance',
            );
          }
          if (call.function === '_signCancelOrder' && txType === 15) {
            const at = venue.active.findIndex(
              (order) => String(order.orderIndex) === String(call.params[2]),
            );
            if (at !== -1) {
              const [cancelled] = venue.active.splice(at, 1);
              venue.inactive.push({ ...cancelled, status: 'canceled' });
            }
          } else if (
            (call.function === '_signCreateOrder' && txType === 14) ||
            (call.function === '_signCreateGroupedOrders' && txType === 28)
          ) {
            const wireOrders =
              call.function === '_signCreateOrder'
                ? [call.params.slice(1, 11)]
                : Array.from({ length: Number(call.params[2]) }, (_, index) =>
                    call.params.slice(3 + index * 10, 13 + index * 10),
                  );
            const created: RecoveryTrigger[] = wireOrders.map((wire) => ({
              orderIndex: venue.nextOrderIndex++,
              clientOrderIndex: Number(wire[1]),
              marketIndex: Number(wire[0]),
              ownerAccountIndex: ACCOUNT_INDEX,
              initialBaseAmount: String(
                Number(wire[2]) / 10 ** MARKET_FIXTURE.supportedSizeDecimals,
              ),
              remainingBaseAmount: String(
                Number(wire[2]) / 10 ** MARKET_FIXTURE.supportedSizeDecimals,
              ),
              price: String(
                Number(wire[3]) / 10 ** MARKET_FIXTURE.supportedPriceDecimals,
              ),
              isAsk: Number(wire[4]) === 1,
              type: Number(wire[5]) === 4 ? 'take-profit' : 'stop-loss',
              timeInForce: 'immediate-or-cancel',
              reduceOnly: Number(wire[7]),
              status: 'open',
              orderExpiry:
                Number(wire[9]) === -1
                  ? Date.now() + 28 * 24 * 60 * 60 * 1000
                  : Number(wire[9]),
              timestamp: Date.now(),
              triggerPrice: String(
                Number(wire[8]) / 10 ** MARKET_FIXTURE.supportedPriceDecimals,
              ),
            }));
            if (created.length === 2) {
              created[0].toCancelOrderId0 = String(created[1].orderIndex);
              created[1].toCancelOrderId0 = String(created[0].orderIndex);
            }
            venue.active.push(...created);
          } else {
            throw new Error(
              'Synthetic venue transaction type does not match its signer call',
            );
          }
          venue.nonce = Math.max(venue.nonce, nonce + 1);
          venue.transactions.set(txHash, { nonce, status: 2 });
          payload = { code: 200, txHash };
          break;
        }
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
    mode,
    controller,
    requests,
    responses,
    disk,
    accountFixture,
    marketFixture: MARKET_FIXTURE,
    venue,
    submissions,
    storageWrites,
    mocks: {
      createClient,
      execute,
      signPersonalMessage,
      debugLog: infrastructure.debugLogger.log,
    },
    bindEngine: () =>
      jest.replaceProperty(Engine.context, 'PerpsController', controller),
    seedTrigger: (type: 'stop-loss' | 'take-profit', triggerPrice: string) => {
      const orderIndex = venue.nextOrderIndex++;
      venue.active.push({
        orderIndex,
        clientOrderIndex: orderIndex,
        marketIndex: 1,
        ownerAccountIndex: ACCOUNT_INDEX,
        initialBaseAmount: '0.1',
        remainingBaseAmount: '0.1',
        price: '80000',
        isAsk: venue.positions[0]?.sign !== -1,
        type,
        timeInForce: 'immediate-or-cancel',
        reduceOnly: 1,
        status: 'open',
        orderExpiry: 0,
        timestamp: 1_700_000_000_000,
        triggerPrice,
      });
      return String(orderIndex);
    },
    seedProtectionRecovery: ({
      symbol = 'BTC',
      operationId = 'source',
      apiKeyIndex = 19,
      survivingOrderIds = [],
    }: {
      symbol?: string;
      operationId?: string;
      apiKeyIndex?: number;
      survivingOrderIds?: string[];
    } = {}) => {
      const settlementKey = `${selectedAccount.address.toLowerCase()}:${ACCOUNT_INDEX}:${apiKeyIndex}:${symbol}`;
      const key = `lighterTpslManual:testnet:${settlementKey}`;
      const indexKey = 'lighterTpslManualIndex:testnet';
      const index = JSON.parse(disk.get(indexKey) ?? '[]') as string[];
      disk.set(
        key,
        JSON.stringify({
          version: 1,
          settlementKey,
          symbol,
          reason: 'manual',
          priorIntent: 'replace',
          priorTriggers: [],
          survivingOrderIds,
          operationId,
          recordedAt: 1,
        }),
      );
      disk.set(
        indexKey,
        JSON.stringify([...new Set([...index, settlementKey])]),
      );
      return {
        key,
        settlementKey,
        operationId,
        successorKey: `lighterTpslSuccessor:testnet:${settlementKey}:${operationId}`,
      };
    },
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
