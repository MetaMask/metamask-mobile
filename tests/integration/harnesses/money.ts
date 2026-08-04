/*
 * Money integration-test harness.
 *
 * Owns the standard `jest.mock(...)` declarations for the Money balance I/O
 * boundary AND a `buildMoneyIntegrationHarness()` factory. Importing this
 * module from a test file triggers the mock side effects (jest hoists them to
 * the top of the test file at transform time), so the harness import must come
 * before any import of the code under test.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REAL (runs production code paths):
 *   - `moneyBalance` Redux slice — real reducer and real selectors over a real
 *     store, so `hasPendingUserOp` transitions are observed through state
 *   - `selectPrimaryMoneyAccount` over real MoneyAccountController +
 *     KeyringController background state
 *   - Money transaction guards (`isMoneyAccountTx`,
 *     `isPerpsPredictMoneyActivity`)
 *   - `invalidateMoneyAccountBalanceCaches`
 *   - The UI QueryClient built by the real `createUIQueryClient` over the real
 *     `DATA_SERVICES` list: real query cache, real `invalidateQueries` →
 *     `<Service>:invalidateQueries` forwarding → real refetch
 *   - A real `Messenger` on `Engine.controllerMessenger`: real subscribe /
 *     publish / unsubscribe semantics
 *
 * MOCKED (the I/O boundary — never makes real network/RPC calls):
 *   - `MoneyAccountBalanceService:fetchBalanceWithFallback` — the balance
 *     API/RPC fetch behind the facade query
 *   - `MoneyAccountBalanceService:invalidateQueries` and
 *     `MoneyAccountApiDataService:invalidateQueries` — the service-local
 *     caches that live behind the messenger
 *   - `Logger` — Sentry transport
 *
 * MOCKED (app-shell glue — the real target chain still runs):
 *   - `app/core/ReactQueryService` — its module-level singleton constructs a
 *     QueryClient bound to the real Engine plus AppState/NetInfo listeners at
 *     import time. The harness swaps in the QueryClient it builds with the
 *     same real `createUIQueryClient` factory.
 *   - `app/core/Engine` and `app/store` — already replaced by
 *     `app/util/test/testSetup.js`. The harness wires the Engine shell to its
 *     real messenger and the store shell's `getState`/`dispatch` to its real
 *     Redux store.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * USAGE — see also tests/integration/AGENTS.md
 *
 *     import { buildMoneyIntegrationHarness }
 *       from '../../../../../tests/integration/harnesses/money';
 *
 *     it('refreshes the balance when a Money deposit confirms', async () => {
 *       const money = buildMoneyIntegrationHarness();
 *       await money.primeBalanceQuery();
 *       money.renderMoneyHook(() => useRefreshMoneyBalanceOnTxConfirm());
 *
 *       money.setTotalBalance('3200000');
 *       money.confirmTransaction(depositTx);
 *
 *       await waitFor(() =>
 *         expect(money.readBalance()?.totalBalance).toBe('3200000'),
 *       );
 *     });
 */

jest.mock('../../../app/core/ReactQueryService', () => ({
  __esModule: true,
  default: { queryClient: undefined },
}));

jest.mock('../../../app/util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

import {
  renderHook,
  type RenderHookResult,
} from '@testing-library/react-native';
import {
  configureStore,
  createAction,
  createReducer,
  type Store,
} from '@reduxjs/toolkit';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { createUIQueryClient } from '@metamask/react-data-query';
import type { QueryClient } from '@tanstack/react-query';
import type { Json } from '@metamask/utils';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { CanonicalMoneyAccountBalanceResponse } from '@metamask/money-account-balance-service';

import Engine from '../../../app/core/Engine';
import { store as appStoreShell } from '../../../app/store';
import ReactQueryService from '../../../app/core/ReactQueryService';
import Logger from '../../../app/util/Logger';
import moneyBalanceReducer from '../../../app/core/redux/slices/moneyBalance';
import { MoneyAccountBalanceServiceQueryKeys } from '../../../app/components/UI/Money/queryKeys';
import { DATA_SERVICES } from '../../../app/constants/data-services';
import ExtendedKeyringTypes from '../../../app/constants/keyringTypes';
import type { RootState } from '../../../app/reducers';

/** The Money account address every harness build uses. */
export const MONEY_ACCOUNT_ADDRESS =
  '0x1111111111111111111111111111111111111111';

const DEFAULT_TOTAL_BALANCE = '3000000';
const PRIMARY_KEYRING_ID = 'primary-hd-keyring';

interface MoneyHarnessEngineState {
  backgroundState: {
    KeyringController: {
      keyrings: {
        type: string;
        accounts: string[];
        metadata: { id: string; name: string };
      }[];
    };
    MoneyAccountController: {
      moneyAccounts: Record<
        string,
        { address: string; options: { entropy: { id: string } } }
      >;
    };
  };
}

interface BalanceQueryFilters {
  queryKey: string[];
}

interface FetchBalanceWithFallbackAction {
  type: 'MoneyAccountBalanceService:fetchBalanceWithFallback';
  handler: (address: string) => Promise<CanonicalMoneyAccountBalanceResponse>;
}

interface BalanceServiceInvalidateQueriesAction {
  type: 'MoneyAccountBalanceService:invalidateQueries';
  handler: (filters: BalanceQueryFilters) => Promise<void>;
}

interface ApiDataServiceInvalidateQueriesAction {
  type: 'MoneyAccountApiDataService:invalidateQueries';
  handler: (filters: BalanceQueryFilters) => Promise<void>;
}

type MoneyHarnessActions =
  | FetchBalanceWithFallbackAction
  | BalanceServiceInvalidateQueriesAction
  | ApiDataServiceInvalidateQueriesAction;

interface MoneyHarnessEvents {
  type: 'TransactionController:transactionConfirmed';
  payload: [TransactionMeta];
}

export type MoneyHarnessMessenger = Messenger<
  MockAnyNamespace,
  MoneyHarnessActions,
  MoneyHarnessEvents
>;

type MessengerAdapterCall = (
  method: string,
  ...params: Json[]
) => Promise<Json | void>;

type MessengerAdapterSubscription = (
  event: string,
  callback: (data: Json) => void,
) => void;

const setHarnessMoneyAccount = createAction<boolean>(
  'moneyHarness/setMoneyAccount',
);

const buildEngineState = (
  hasMoneyAccount: boolean,
): MoneyHarnessEngineState => ({
  backgroundState: {
    KeyringController: {
      keyrings: [
        {
          type: ExtendedKeyringTypes.hd,
          accounts: [MONEY_ACCOUNT_ADDRESS],
          metadata: { id: PRIMARY_KEYRING_ID, name: '' },
        },
      ],
    },
    MoneyAccountController: {
      moneyAccounts: hasMoneyAccount
        ? {
            [MONEY_ACCOUNT_ADDRESS]: {
              address: MONEY_ACCOUNT_ADDRESS,
              options: { entropy: { id: PRIMARY_KEYRING_ID } },
            },
          }
        : {},
    },
  },
});

const buildBalance = (
  totalBalance: string,
): CanonicalMoneyAccountBalanceResponse => ({
  musdBalance: totalBalance,
  vmusdValueInMusd: '0',
  totalBalance,
  source: 'rpc',
  usedFallback: false,
});

export interface MoneyHarnessOptions {
  /**
   * Whether the wallet already owns a primary Money account. Pass `false` to
   * build a wallet that has none yet.
   */
  hasMoneyAccount?: boolean;
  /** Raw mUSD total balance the mocked balance fetch resolves with. */
  totalBalance?: string;
}

export interface MoneyIntegrationHarness {
  /** The real Redux store running the real `moneyBalance` reducer. */
  store: Store;
  /** Current state, typed for the real Money selectors. */
  getState: () => RootState;
  /** The real UI QueryClient installed on the ReactQueryService shell. */
  queryClient: QueryClient;
  /** The real messenger installed on `Engine.controllerMessenger`. */
  messenger: MoneyHarnessMessenger;
  /** Render a Money hook against the wired app shell. */
  renderMoneyHook: <Result>(
    hook: () => Result,
  ) => RenderHookResult<Result, never>;
  /** Publish a real `TransactionController:transactionConfirmed` event. */
  confirmTransaction: (transactionMeta: TransactionMeta) => void;
  /** Populate the balance facade query so consumers have a baseline snapshot. */
  primeBalanceQuery: () => Promise<void>;
  /** Read the balance facade query straight from the real query cache. */
  readBalance: () => CanonicalMoneyAccountBalanceResponse | undefined;
  /** Change the balance the mocked fetch resolves with from now on. */
  setTotalBalance: (totalBalance: string) => void;
  /** Add or remove the primary Money account after the harness is built. */
  setHasMoneyAccount: (hasMoneyAccount: boolean) => void;
  /** Mocked dependencies; override behaviour per-test as needed. */
  mocks: {
    fetchBalanceWithFallback: jest.Mock;
    invalidateBalanceServiceQueries: jest.Mock;
    invalidateApiDataServiceQueries: jest.Mock;
    logger: { log: jest.Mock; error: jest.Mock };
  };
}

export function buildMoneyIntegrationHarness(
  options: MoneyHarnessOptions = {},
): MoneyIntegrationHarness {
  const engineReducer = createReducer(
    buildEngineState(options.hasMoneyAccount ?? true),
    (builder) => {
      builder.addCase(setHarnessMoneyAccount, (_state, action) =>
        buildEngineState(action.payload),
      );
    },
  );

  const store = configureStore({
    reducer: {
      moneyBalance: moneyBalanceReducer,
      engine: engineReducer,
    },
  });

  const shell = appStoreShell as unknown as {
    getState: jest.Mock;
    dispatch: jest.Mock;
  };
  shell.getState.mockReset();
  shell.dispatch.mockReset();
  shell.getState.mockImplementation(() => store.getState());
  shell.dispatch.mockImplementation((action) => store.dispatch(action));

  let balance = buildBalance(options.totalBalance ?? DEFAULT_TOTAL_BALANCE);

  const fetchBalanceWithFallback = jest.fn(async () => balance);
  const invalidateBalanceServiceQueries = jest.fn(async () => undefined);
  const invalidateApiDataServiceQueries = jest.fn(async () => undefined);

  const messenger: MoneyHarnessMessenger = new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
  messenger.registerActionHandler(
    'MoneyAccountBalanceService:fetchBalanceWithFallback',
    fetchBalanceWithFallback,
  );
  messenger.registerActionHandler(
    'MoneyAccountBalanceService:invalidateQueries',
    invalidateBalanceServiceQueries,
  );
  messenger.registerActionHandler(
    'MoneyAccountApiDataService:invalidateQueries',
    invalidateApiDataServiceQueries,
  );

  Object.assign(Engine as unknown as Record<string, unknown>, {
    controllerMessenger: messenger,
  });

  const messengerAdapter = {
    call: messenger.call.bind(messenger) as unknown as MessengerAdapterCall,
    subscribe: messenger.subscribe.bind(
      messenger,
    ) as unknown as MessengerAdapterSubscription,
    unsubscribe: messenger.unsubscribe.bind(
      messenger,
    ) as unknown as MessengerAdapterSubscription,
  };

  const queryClient = createUIQueryClient(DATA_SERVICES, messengerAdapter, {
    defaultOptions: { queries: { retry: false } },
  });
  ReactQueryService.queryClient = queryClient;

  const logger = {
    log: Logger.log as unknown as jest.Mock,
    error: Logger.error as unknown as jest.Mock,
  };
  logger.log.mockClear();
  logger.error.mockClear();

  const balanceQueryKey = [
    MoneyAccountBalanceServiceQueryKeys.FETCH_BALANCE_WITH_FALLBACK,
    MONEY_ACCOUNT_ADDRESS,
  ];

  const primeBalanceQuery = async () => {
    await queryClient.fetchQuery<CanonicalMoneyAccountBalanceResponse>({
      queryKey: balanceQueryKey,
    });
  };

  const readBalance = () =>
    queryClient.getQueryData<CanonicalMoneyAccountBalanceResponse>(
      balanceQueryKey,
    );

  const renderMoneyHook = <Result>(hook: () => Result) =>
    renderHook<Result, never>(hook);

  return {
    store,
    getState: () => store.getState() as unknown as RootState,
    queryClient,
    messenger,
    renderMoneyHook,
    confirmTransaction: (transactionMeta) =>
      messenger.publish(
        'TransactionController:transactionConfirmed',
        transactionMeta,
      ),
    primeBalanceQuery,
    readBalance,
    setTotalBalance: (totalBalance: string) => {
      balance = buildBalance(totalBalance);
    },
    setHasMoneyAccount: (hasMoneyAccount: boolean) => {
      store.dispatch(setHarnessMoneyAccount(hasMoneyAccount));
    },
    mocks: {
      fetchBalanceWithFallback,
      invalidateBalanceServiceQueries,
      invalidateApiDataServiceQueries,
      logger,
    },
  };
}
