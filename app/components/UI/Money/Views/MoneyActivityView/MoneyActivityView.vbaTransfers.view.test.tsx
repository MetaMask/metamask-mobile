import '../../../../../../tests/component-view/mocks';
import { waitFor, within } from '@testing-library/react-native';
import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import type { MoneyAccountApiDataService } from '@metamask/money-account-api-data-service';
import type { V1AccountTransactionsResponse } from '@metamask/core-backend';
import Engine from '../../../../../core/Engine';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { apiClient } from '../../../../../core/apiClient';
import { strings } from '../../../../../../locales/i18n';
import { moneyAccountApiDataServiceInit } from '../../../../../core/Engine/controllers/money-account-api-data-service-init';
import { getMoneyAccountApiDataServiceMessenger } from '../../../../../core/Engine/messengers/money-account-api-data-service-messenger';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { VBA_TEST_MONEY_ADDRESS } from '../../../../../../tests/component-view/presets/vba';
import {
  renderVbaTransfersActivity,
  restoreVbaTransfersReduxServiceStore,
} from '../../../../../../tests/component-view/renderers/vbaTransfers';
import {
  EMPTY_ACCOUNT_PAGE,
  type AccountPage,
  VBA_SIWE_TOKEN,
  createVbaHttpCalls,
  setupAccountTransactionsApiMock,
  setupVbaTransfersApiMock,
  startVbaTransfersNock,
  teardownVbaTransfersNock,
  type VbaHttpCalls,
  type VbaTransfer,
  type VbaTransfersReply,
} from '../../../../../../tests/component-view/api-mocking/vbaTransfers';
import { MoneyActivityItemTestIds } from '../../components/MoneyActivityItem/MoneyActivityItem.testIds';
import { MoneyActivityViewTestIds } from './MoneyActivityView.testIds';

/**
 * USD VBA deposits in Money activity, read from TRAM-4375's
 * `GET /v1/vba/transfers`.
 *
 * Real: `MoneyAccountApiDataService` built by the app's own init and
 * messenger, including its SIWE exchange, response validation and retry
 * policy. Fake: HTTP (nock at the real Money Account API and Accounts API
 * paths) and, on the Engine mock, the keyring signature plus the routing of
 * `MoneyAccountApiDataService:fetchVbaTransfers` to that real service.
 */

const SIGNATURE = `0x${'cd'.repeat(65)}`;
const WALLET = VBA_TEST_MONEY_ADDRESS.toLowerCase();
const COMPLETED_HASH = `0x${'ab'.repeat(32)}`;
const PENDING_ID = 'usd-ach-processing';
const FAILED_ID = 'usd-ach-error';

const transfer = (
  id: string,
  status: VbaTransfer['status'],
  timestamp: string,
  amount: string,
  transactionHash: string | null,
): VbaTransfer => ({
  event_id: `${id}-event`,
  transfer_id: id,
  status,
  event_timestamp: timestamp,
  updated_at: timestamp,
  transfer: {
    sender_address: null,
    recipient_address: VBA_TEST_MONEY_ADDRESS,
    network: 'monad',
    amount,
    asset: 'mUSD',
    transaction_hash: transactionHash,
  },
});

const PENDING = transfer(
  PENDING_ID,
  'processing',
  '2026-10-22T15:00:00.000Z',
  '25.00',
  null,
);
const FAILED = transfer(
  FAILED_ID,
  'error',
  '2026-10-21T15:00:00.000Z',
  '8.00',
  null,
);
const COMPLETED = transfer(
  'usd-ach-confirmed',
  'confirmed',
  '2026-10-20T15:00:00.000Z',
  '15.000000',
  COMPLETED_HASH,
);

const ok = (transfers: VbaTransfer[]): VbaTransfersReply => ({
  status: 200,
  body: { transfers },
});

const rowTestId = (id: string) => `${MoneyActivityItemTestIds.ROW}-${id}`;

/** A raw Accounts API row: counts toward the page watermark, not shown. */
const rawAccountTx = (
  hash: string,
  timestamp: string,
): V1AccountTransactionsResponse['data'][number] => ({
  hash,
  timestamp,
  chainId: 143,
  blockNumber: 1,
  blockHash: `0x${'00'.repeat(32)}`,
  gas: 21000,
  gasUsed: 21000,
  gasPrice: '0',
  effectiveGasPrice: '0',
  nonce: 0,
  cumulativeGasUsed: 21000,
  value: '0',
  to: '0x2222222222222222222222222222222222222222',
  from: VBA_TEST_MONEY_ADDRESS,
});

const engineCall = Engine.controllerMessenger.call as jest.Mock;

const createRealDataService = (): MoneyAccountApiDataService => {
  const rootMessenger = new Messenger({ namespace: MOCK_ANY_NAMESPACE });
  const register = (
    rootMessenger as unknown as {
      registerActionHandler: (
        action: string,
        handler: (...args: unknown[]) => unknown,
      ) => void;
    }
  ).registerActionHandler.bind(rootMessenger);
  register('KeyringController:signPersonalMessage', async () => SIGNATURE);
  register('AuthenticationController:getBearerToken', async () => undefined);
  const { controller } = moneyAccountApiDataServiceInit({
    controllerMessenger: getMoneyAccountApiDataServiceMessenger(
      rootMessenger as never,
    ),
  } as unknown as Parameters<typeof moneyAccountApiDataServiceInit>[0]);
  return controller;
};

const routeVbaTransfersToRealService = (
  service: MoneyAccountApiDataService,
) => {
  const previous = engineCall.getMockImplementation();
  engineCall.mockImplementation((action: string, ...args: unknown[]) => {
    if (action === 'MoneyAccountApiDataService:fetchVbaTransfers') {
      return service.fetchVbaTransfers(
        args[0] as Parameters<
          MoneyAccountApiDataService['fetchVbaTransfers']
        >[0],
      );
    }
    return previous ? previous(action, ...args) : Promise.resolve(undefined);
  });
  return () => {
    engineCall.mockImplementation(
      previous ?? (() => Promise.resolve(undefined)),
    );
  };
};

const createDeferred = () => {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describeForPlatforms(
  'Money activity: USD VBA transfers (/v1/vba/transfers)',
  () => {
    let calls: VbaHttpCalls;
    let restoreEngine: () => void;

    const arrange = (
      replies: VbaTransfersReply[],
      accountPages: Record<string, AccountPage> = {
        first: { response: EMPTY_ACCOUNT_PAGE },
      },
    ) => {
      setupVbaTransfersApiMock(calls, replies);
      setupAccountTransactionsApiMock(calls, accountPages);
      return renderVbaTransfersActivity();
    };

    beforeEach(async () => {
      jest.clearAllMocks();
      // Accounts API pages are cached twice: on disk (moneyActivityCache seeds
      // page one) and in the shared apiClient query cache. Without clearing both,
      // a later test reuses an earlier test's pages and never requests its own.
      await StorageWrapper.clearAll();
      apiClient.clear();
      startVbaTransfersNock();
      calls = createVbaHttpCalls();
      restoreEngine = routeVbaTransfersToRealService(createRealDataService());
    });

    afterEach(() => {
      restoreEngine();
      restoreVbaTransfersReduxServiceStore();
      teardownVbaTransfersNock();
    });

    describe('loaded and empty', () => {
      it('shows processing, failed and confirmed USD deposits from the transfers endpoint', async () => {
        const { findByTestId, getByTestId } = arrange([
          ok([PENDING, FAILED, COMPLETED]),
        ]);

        const pendingRow = await findByTestId(rowTestId(PENDING_ID));
        const failedRow = getByTestId(rowTestId(FAILED_ID));
        const completedRow = getByTestId(rowTestId(COMPLETED_HASH));

        expect(
          within(pendingRow).getByText(strings('money.transaction.depositing')),
        ).toBeOnTheScreen();
        expect(
          within(pendingRow).getByText(
            strings('money.transaction.bank_transfer'),
          ),
        ).toBeOnTheScreen();
        expect(within(pendingRow).getByText('+25.00 mUSD')).toBeOnTheScreen();
        expect(
          within(failedRow).getByText(
            strings('money.transaction.deposit_failed'),
          ),
        ).toBeOnTheScreen();
        expect(
          within(completedRow).getByText(
            strings('money.transaction.deposited'),
          ),
        ).toBeOnTheScreen();
        expect(within(completedRow).getByText('+15.00 mUSD')).toBeOnTheScreen();
        expect(
          getByTestId(MoneyActivityViewTestIds.PENDING_HEADER),
        ).toHaveTextContent(strings('money.activity.pending'));
      });

      it('signs in with SIWE for the Money wallet and sends the session token to /v1/vba/transfers', async () => {
        const { findByTestId } = arrange([ok([PENDING])]);

        expect(await findByTestId(rowTestId(PENDING_ID))).toBeOnTheScreen();
        expect(calls.challenge).toEqual([{ address: WALLET }]);
        expect(calls.verify).toEqual([
          { message: expect.stringContaining(WALLET), signature: SIGNATURE },
        ]);
        expect(calls.transfers).toEqual([
          { authorization: `Bearer ${VBA_SIWE_TOKEN}` },
        ]);
      });

      it('shows the empty activity message when the endpoint returns no transfers', async () => {
        const { findByTestId, queryByTestId } = arrange([ok([])]);

        await waitFor(() => expect(calls.transfers).toHaveLength(1));
        expect(
          await findByTestId(MoneyActivityViewTestIds.EMPTY_LIST_MESSAGE),
        ).toHaveTextContent(strings('money.activity.empty'));
        expect(
          queryByTestId(MoneyActivityViewTestIds.LIST),
        ).not.toBeOnTheScreen();
      });

      it('drops a transfer for another wallet even when the endpoint returns it', async () => {
        const otherWallet: VbaTransfer = {
          ...PENDING,
          transfer: {
            ...PENDING.transfer,
            recipient_address: '0x3333333333333333333333333333333333333333',
          },
        };
        const { findByTestId, queryByTestId } = arrange([ok([otherWallet])]);

        expect(
          await findByTestId(MoneyActivityViewTestIds.EMPTY_LIST_MESSAGE),
        ).toHaveTextContent(strings('money.activity.empty'));
        expect(queryByTestId(rowTestId(PENDING_ID))).not.toBeOnTheScreen();
      });
    });

    describe('errors', () => {
      it('renews the SIWE session once after a 401 and then shows the deposits', async () => {
        const { findByTestId } = arrange([
          { status: 401, body: { message: 'session expired' } },
          ok([PENDING]),
        ]);

        expect(await findByTestId(rowTestId(PENDING_ID))).toBeOnTheScreen();
        expect(calls.challenge).toHaveLength(2);
        expect(calls.transfers).toHaveLength(2);
      });

      it('does not retry a 403 and shows no VBA deposits (today: the empty message)', async () => {
        const { findByTestId, queryByTestId } = arrange([
          { status: 403, body: { message: 'forbidden' } },
        ]);

        expect(
          await findByTestId(MoneyActivityViewTestIds.EMPTY_LIST_MESSAGE),
        ).toHaveTextContent(strings('money.activity.empty'));
        expect(calls.transfers).toHaveLength(1);
        expect(queryByTestId(rowTestId(PENDING_ID))).not.toBeOnTheScreen();
      });

      it('retries a 5xx before giving up and shows no VBA deposits (today: the empty message)', async () => {
        const { findByTestId, queryByTestId } = arrange([
          { status: 503, body: { message: 'unavailable' } },
        ]);

        await waitFor(() => expect(calls.transfers.length).toBeGreaterThan(1), {
          timeout: 10000,
        });
        expect(
          await findByTestId(
            MoneyActivityViewTestIds.EMPTY_LIST_MESSAGE,
            {},
            { timeout: 10000 },
          ),
        ).toHaveTextContent(strings('money.activity.empty'));
        expect(queryByTestId(rowTestId(PENDING_ID))).not.toBeOnTheScreen();
      }, 20000);

      // Bug (same as #38589's case, fixed by #38592): a failed transfers read
      // looks like "No activity yet" instead of the load error with Retry.
      it.failing.each([
        ['403', 403],
        ['503', 503],
      ] as const)(
        'shows the activity load error when /v1/vba/transfers answers %s',
        async (_label, status) => {
          const { findByTestId } = arrange([
            { status, body: { message: 'failed' } },
          ]);

          expect(
            await findByTestId(
              MoneyActivityViewTestIds.EMPTY_LIST_MESSAGE,
              {},
              { timeout: 10000 },
            ),
          ).toHaveTextContent(strings('money.activity.load_error'));
        },
        20000,
      );
    });

    describe('pagination with the Accounts API history', () => {
      it('holds a confirmed deposit older than the first history page until the next page arrives', async () => {
        const nextPage = createDeferred();
        const { findByTestId, queryByTestId } = arrange(
          [ok([PENDING, COMPLETED])],
          {
            first: {
              response: {
                data: [
                  rawAccountTx(
                    `0x${'01'.repeat(32)}`,
                    '2026-10-25T00:00:00.000Z',
                  ),
                ],
                pageInfo: { count: 1, hasNextPage: true, cursor: 'page-2' },
              },
            },
            'page-2': {
              response: {
                data: [
                  rawAccountTx(
                    `0x${'02'.repeat(32)}`,
                    '2026-10-01T00:00:00.000Z',
                  ),
                ],
                pageInfo: { count: 1, hasNextPage: false },
              },
              hold: nextPage.promise,
            },
          },
        );

        expect(await findByTestId(rowTestId(PENDING_ID))).toBeOnTheScreen();
        await waitFor(() =>
          expect(calls.accountPages).toEqual([undefined, 'page-2']),
        );
        expect(queryByTestId(rowTestId(COMPLETED_HASH))).not.toBeOnTheScreen();

        nextPage.resolve();

        expect(await findByTestId(rowTestId(COMPLETED_HASH))).toBeOnTheScreen();
        expect(calls.transfers).toHaveLength(1);
      });

      it('shows a confirmed deposit newer than the first history page without waiting for more pages', async () => {
        const nextPage = createDeferred();
        const { findByTestId } = arrange([ok([COMPLETED])], {
          first: {
            response: {
              data: [
                rawAccountTx(
                  `0x${'01'.repeat(32)}`,
                  '2026-10-10T00:00:00.000Z',
                ),
              ],
              pageInfo: { count: 1, hasNextPage: true, cursor: 'page-2' },
            },
          },
          'page-2': {
            response: EMPTY_ACCOUNT_PAGE,
            hold: nextPage.promise,
          },
        });

        expect(await findByTestId(rowTestId(COMPLETED_HASH))).toBeOnTheScreen();

        // Let page 2 finish before teardown so it can't leak into the next test.
        nextPage.resolve();
        await waitFor(() =>
          expect(calls.accountPagesReplied).toEqual([undefined, 'page-2']),
        );
        expect(await findByTestId(rowTestId(COMPLETED_HASH))).toBeOnTheScreen();
      });
    });
  },
);
