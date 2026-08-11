/**
 * Money data mocks for component view tests.
 *
 * The Money balance, vault APY and interest queries are key-only
 * `@metamask/react-data-query` queries: `createUIQueryClient` resolves them by
 * calling the query-key action on the messenger, which `render.tsx` routes to
 * `Engine.controllerMessenger.call`. They therefore cannot be intercepted with
 * nock — they are seeded by spying on the messenger instead.
 *
 * Card activity is a plain HTTP call to the Accounts API and is nocked.
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import BigNumber from 'bignumber.js';
import Engine from '../../../app/core/Engine';
import { MUSD_DECIMALS } from '../../../app/components/UI/Earn/constants/musd';
import {
  MoneyAccountApiDataServiceQueryKeys,
  MoneyAccountBalanceServiceQueryKeys,
} from '../../../app/components/UI/Money/queryKeys';
import {
  clearAllNockMocks,
  disableNetConnect,
  teardownNock,
} from './nockHelpers';

const ACCOUNTS_API_ORIGIN = 'https://accounts.api.cx.metamask.io';
const ACCOUNT_TRANSACTIONS_PATH =
  /\/v1\/accounts\/0x[0-9a-fA-F]+\/transactions/u;

export interface MoneyDataServiceMockOptions {
  /** Total Money account balance in dollars. */
  balance?: number;
  /** Withdrawable portion of the balance in dollars. */
  withdrawableBalance?: number;
  /** Vault APY as a decimal, e.g. 0.05 for 5%. */
  apy?: number;
  /** Interest earned in USD, returned for every requested window. */
  interest?: string;
}

let messengerSpy: jest.SpyInstance | undefined;

const toRawMusd = (dollars: number) =>
  new BigNumber(dollars).shiftedBy(MUSD_DECIMALS).toFixed(0);

/**
 * Spies on `Engine.controllerMessenger.call` and answers the Money data-service
 * actions the Money Home queries dispatch. Unmatched actions fall through to the
 * Engine mock's own implementation.
 */
export function setupMoneyDataServiceMock({
  balance = 0,
  withdrawableBalance = balance,
  apy = 0.05,
  interest = '0',
}: MoneyDataServiceMockOptions = {}): void {
  clearMoneyDataServiceMock();

  const originalCall = Engine.controllerMessenger.call.bind(
    Engine.controllerMessenger,
  );

  messengerSpy = jest
    .spyOn(Engine.controllerMessenger, 'call')
    .mockImplementation((...messengerArgs) => {
      const [action] = messengerArgs as [string, ...unknown[]];

      if (
        action ===
        MoneyAccountBalanceServiceQueryKeys.FETCH_BALANCE_WITH_FALLBACK
      ) {
        return Promise.resolve({
          totalBalance: toRawMusd(balance),
          vmusdValueInMusd: toRawMusd(withdrawableBalance),
          source: 'api',
          usedFallback: false,
        }) as ReturnType<typeof Engine.controllerMessenger.call>;
      }

      if (action === MoneyAccountBalanceServiceQueryKeys.GET_VAULT_APY) {
        return Promise.resolve({ apy }) as ReturnType<
          typeof Engine.controllerMessenger.call
        >;
      }

      if (action === MoneyAccountApiDataServiceQueryKeys.FETCH_INTEREST) {
        return Promise.resolve({
          interest_earned_usd: interest,
        }) as ReturnType<typeof Engine.controllerMessenger.call>;
      }

      const passthroughArgs = messengerArgs as Parameters<
        typeof Engine.controllerMessenger.call
      >;
      return Reflect.apply(
        originalCall,
        Engine.controllerMessenger,
        passthroughArgs,
      ) as ReturnType<typeof Engine.controllerMessenger.call>;
    });
}

/**
 * Registers a persistent nock interceptor for the Accounts API transactions
 * endpoint backing the Money card activity list, returning an empty page.
 */
export function setupMoneyActivityApiMock(): void {
  clearAllNockMocks();
  disableNetConnect();

  nock(ACCOUNTS_API_ORIGIN)
    .persist()
    .get(ACCOUNT_TRANSACTIONS_PATH)
    .query(true)
    .reply(200, {
      data: [],
      pageInfo: { count: 0, hasNextPage: false },
    });
}

export function clearMoneyDataServiceMock(): void {
  if (messengerSpy) {
    messengerSpy.mockRestore();
    messengerSpy = undefined;
  }
}

/**
 * Restores the messenger spy and all nock interceptors. Call in `afterEach`.
 */
export function clearMoneyApiMocks(): void {
  clearMoneyDataServiceMock();
  teardownNock();
}
