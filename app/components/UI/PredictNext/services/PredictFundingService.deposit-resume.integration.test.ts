import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { TransactionMeta } from '@metamask/transaction-controller';
import {
  buildPredictNextIntegrationHarness as createPredictNextIntegrationHarness,
  routePredictApi,
  type PredictFetchResponder,
  type PredictNextIntegrationHarness,
} from '../../../../../tests/integration/harnesses/predict-next';
import { getPredictFundingServiceMessenger } from '../../../../core/Engine/messengers/predict-funding-service-messenger';
import {
  KALSHI_VENUE_ID,
  KalshiRemoteAdapter,
} from '../adapters/remote/KalshiRemoteAdapter';
import { PredictApiReadClient } from '../adapters/remote/PredictApiReadClient';
import awaitingTransfer from '../contracts/v1/fixtures/funding-contract/awaiting-transfer.json';
import credited from '../contracts/v1/fixtures/funding-contract/credited.json';
import transferReported from '../contracts/v1/fixtures/funding-contract/transfer-reported.json';
import {
  flushMicrotasks,
  makeDepositTransferTx,
} from '../funding/deposit/testUtils';
import type { PredictHex } from '../types';
import {
  PredictFundingService,
  type PredictFundingServiceActions,
  type PredictFundingServiceEvents,
} from './PredictFundingService';

const OPERATION_ID = awaitingTransfer.operationId;
const DEPOSITS_PATH = '/v1/venues/kalshi/deposits';
const DEPOSIT_PATH = `/v1/venues/kalshi/deposits/${OPERATION_ID}`;
const TRANSFER_PATH = `/v1/venues/kalshi/deposits/${OPERATION_ID}/transfer`;
const BALANCE_PATH = '/v1/venues/kalshi/balance';
const SUMMARY_PATH = '/v1/venues/kalshi/portfolio/summary';
const POSITIONS_PATH = '/v1/venues/kalshi/positions';
const ACTIVITY_PATH = '/v1/venues/kalshi/activity';

const TX_HASH = transferReported.txHash as PredictHex;

describe('PredictFundingService deposit resume across service restart', () => {
  const harnesses: PredictNextIntegrationHarness[] = [];
  const services: PredictFundingService[] = [];

  const callsTo = (harness: PredictNextIntegrationHarness, path: string) =>
    harness.fetchMock.mock.calls.filter(([url]) => {
      const urlString =
        typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      return new URL(urlString).pathname === path;
    });

  afterEach(() => {
    services.splice(0).forEach((service) => service.destroy());
    harnesses.splice(0).forEach((harness) => harness.destroy());
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('reports a broadcast transfer exactly once across a service kill/restart and refreshes only Balance and Summary', async () => {
    jest.useFakeTimers();
    let nowMs = Date.parse(awaitingTransfer.createdAt) + 5_000;
    let depositState: unknown = awaitingTransfer;
    let availableBalance = '10.00';
    let detailReadsAfterReport = 0;

    const makeApiHandler = () =>
      routePredictApi({
        [DEPOSITS_PATH]: () => ({
          body: {
            deposits:
              depositState === awaitingTransfer ||
              depositState === transferReported
                ? [depositState]
                : [],
          },
        }),
        [TRANSFER_PATH]: () => {
          depositState = transferReported;
          return { body: transferReported };
        },
        [DEPOSIT_PATH]: () => {
          detailReadsAfterReport += 1;
          if (detailReadsAfterReport >= 2) {
            depositState = credited;
            availableBalance = '35.50';
          }
          return { body: depositState };
        },
        [BALANCE_PATH]: () => ({
          body: {
            venueId: 'kalshi',
            currency: 'USD',
            available: availableBalance,
          },
        }),
        [SUMMARY_PATH]: () => ({
          body: {
            venueId: 'kalshi',
            currency: 'USD',
            availableBalance,
            positionsValue: '0.00',
            totalValue: availableBalance,
            unrealizedPnl: '0.00',
            unrealizedPnlPercent: '0.00',
          },
        }),
      });

    // Wallet TransactionController state persists across a service kill/restart.
    const transactions: TransactionMeta[] = [];

    const startAppSession = () => {
      const harness = createPredictNextIntegrationHarness(makeApiHandler());
      harnesses.push(harness);
      const messenger = getPredictFundingServiceMessenger(
        harness.messenger as unknown as Parameters<
          typeof getPredictFundingServiceMessenger
        >[0],
      );
      const invalidateSpy = jest.spyOn(messenger, 'call');
      const publishSpy = jest.spyOn(messenger, 'publish');
      const service = new PredictFundingService({
        messenger,
        funding: harness.adapter.funding,
        venueId: harness.adapter.venueId,
        getTransactions: () => transactions,
        now: () => nowMs,
      });
      services.push(service);
      return { harness, service, invalidateSpy, publishSpy };
    };

    // 1. Session A: seed Balance, list open deposit, then user broadcasts transfer on-chain.
    const sessionA = startAppSession();
    const initialBalance =
      await sessionA.harness.portfolioService.getBalance(KALSHI_VENUE_ID);
    expect(initialBalance.available).toBe('10.00');

    const openBeforeBroadcast =
      await sessionA.service.listOpenDeposits(KALSHI_VENUE_ID);
    expect(openBeforeBroadcast).toHaveLength(1);
    expect(sessionA.service.getDepositStatus(KALSHI_VENUE_ID)?.status).toBe(
      'awaiting_transfer',
    );

    transactions.push(
      makeDepositTransferTx(awaitingTransfer, {
        id: 'tx-broadcast-1',
        time: nowMs,
        hash: TX_HASH,
      }),
    );

    // 2. Kill session A BEFORE reportDepositTransfer ever happens.
    sessionA.service.destroy();
    services.pop();
    sessionA.harness.destroy();
    harnesses.pop();
    expect(callsTo(sessionA.harness, TRANSFER_PATH)).toHaveLength(0);

    // 3. Restart service in session B and resume on start.
    const sessionB = startAppSession();
    await Promise.all([
      sessionB.service.resumeDeposits(),
      sessionB.service.resumeDeposits(),
    ]);

    // Exactly one transfer report went over the wire.
    expect(callsTo(sessionB.harness, TRANSFER_PATH)).toHaveLength(1);
    const transferBody = callsTo(sessionB.harness, TRANSFER_PATH)[0][1]?.body;
    expect(typeof transferBody).toBe('string');
    expect(JSON.parse(transferBody as string)).toEqual({
      txHash: TX_HASH,
      chainId: awaitingTransfer.chainId,
    });
    expect(sessionB.service.getDepositStatus(KALSHI_VENUE_ID)?.status).toBe(
      'processing',
    );

    // Pending deposit amount is never added to the authoritative balance.
    const balanceWhileProcessing =
      await sessionB.harness.portfolioService.getBalance(KALSHI_VENUE_ID);
    expect(balanceWhileProcessing.available).toBe('10.00');

    // 4. First poll (2s) stays processing; second poll (+4s) reaches completed.
    nowMs += 2_000;
    jest.advanceTimersByTime(2_000);
    await flushMicrotasks();
    expect(sessionB.service.getDepositStatus(KALSHI_VENUE_ID)?.status).toBe(
      'processing',
    );

    nowMs += 4_000;
    jest.advanceTimersByTime(4_000);
    await flushMicrotasks();

    // Still only one transfer report total.
    expect(callsTo(sessionB.harness, TRANSFER_PATH)).toHaveLength(1);
    expect(sessionB.service.getDepositStatus(KALSHI_VENUE_ID)).toBeNull();

    // depositResolved published exactly once with status completed.
    const resolvedEvents = sessionB.publishSpy.mock.calls.filter(
      ([event]) => event === 'PredictFundingService:depositResolved',
    );
    expect(resolvedEvents).toHaveLength(1);
    expect(resolvedEvents[0][1]).toMatchObject({
      venueId: KALSHI_VENUE_ID,
      deposit: expect.objectContaining({
        operationId: OPERATION_ID,
        status: 'completed',
      }),
    });

    // Only Balance and Portfolio Summary query families were invalidated.
    const invalidatedKeys = sessionB.invalidateSpy.mock.calls
      .filter(
        ([action]) => action === 'PredictPortfolioService:invalidateQueries',
      )
      .map(([, request]) => (request as { queryKey: unknown }).queryKey);
    expect(invalidatedKeys).toEqual([
      ['PredictPortfolioService:getBalance', KALSHI_VENUE_ID],
      ['PredictPortfolioService:getPortfolioSummary', KALSHI_VENUE_ID],
    ]);

    // Positions and Activity were never touched.
    expect(callsTo(sessionB.harness, POSITIONS_PATH)).toHaveLength(0);
    expect(callsTo(sessionB.harness, ACTIVITY_PATH)).toHaveLength(0);

    // Authoritative balance now reflects the credited amount.
    const finalBalance =
      await sessionB.harness.portfolioService.getBalance(KALSHI_VENUE_ID);
    expect(finalBalance.available).toBe('35.50');
  });

  it('produces one server-side credit when the transfer report response is lost before restart', async () => {
    jest.useFakeTimers();
    let nowMs = Date.parse(awaitingTransfer.createdAt) + 5_000;
    let depositState: unknown = awaitingTransfer;
    let availableBalance = '10.00';
    let creditCount = 0;
    let dropFirstTransferResponse = true;
    let detailReadsAfterResume = 0;

    const baseRoutes = routePredictApi({
      [DEPOSITS_PATH]: () => ({
        body: {
          deposits:
            depositState === awaitingTransfer ||
            depositState === transferReported
              ? [depositState]
              : [],
        },
      }),
      [DEPOSIT_PATH]: () => {
        detailReadsAfterResume += 1;
        if (creditCount === 1 && detailReadsAfterResume >= 1) {
          depositState = credited;
          availableBalance = '35.50';
        }
        return { body: depositState };
      },
      [BALANCE_PATH]: () => ({
        body: {
          venueId: 'kalshi',
          currency: 'USD',
          available: availableBalance,
        },
      }),
      [SUMMARY_PATH]: () => ({
        body: {
          venueId: 'kalshi',
          currency: 'USD',
          availableBalance,
          positionsValue: '0.00',
          totalValue: availableBalance,
          unrealizedPnl: '0.00',
          unrealizedPnlPercent: '0.00',
        },
      }),
    });

    const makeApiHandler =
      (): PredictFetchResponder =>
      async (
        input,
        init,
      ): Promise<Awaited<ReturnType<PredictFetchResponder>>> => {
        const url = new URL(input);
        if (url.pathname === TRANSFER_PATH) {
          // Server idempotently records the transfer once even if the HTTP
          // response is lost on the first attempt.
          if (creditCount === 0) {
            creditCount = 1;
            depositState = transferReported;
          }
          if (dropFirstTransferResponse) {
            dropFirstTransferResponse = false;
            throw new TypeError('Network request failed');
          }
          return { body: depositState };
        }
        return baseRoutes(input, init);
      };

    const persistedTransactions = JSON.stringify([
      makeDepositTransferTx(awaitingTransfer, {
        id: 'tx-broadcast-lost-response',
        time: nowMs,
        hash: TX_HASH,
      }),
    ]);

    const startAppSession = (transactions: TransactionMeta[]) => {
      const harness = createPredictNextIntegrationHarness(makeApiHandler());
      harnesses.push(harness);
      const messenger = getPredictFundingServiceMessenger(
        harness.messenger as unknown as Parameters<
          typeof getPredictFundingServiceMessenger
        >[0],
      );
      const invalidateSpy = jest.spyOn(messenger, 'call');
      const publishSpy = jest.spyOn(messenger, 'publish');
      const service = new PredictFundingService({
        messenger,
        funding: harness.adapter.funding,
        venueId: harness.adapter.venueId,
        getTransactions: () => transactions,
        now: () => nowMs,
      });
      services.push(service);
      return { harness, service, invalidateSpy, publishSpy };
    };

    // Session A: server records the transfer report, then the HTTP response drops.
    const sessionA = startAppSession(
      JSON.parse(persistedTransactions) as TransactionMeta[],
    );
    await sessionA.service.resumeDeposits();
    expect(creditCount).toBe(1);
    expect(callsTo(sessionA.harness, TRANSFER_PATH)).toHaveLength(1);

    // Kill session A before it ever receives a response or polls completion.
    sessionA.service.destroy();
    services.pop();
    sessionA.harness.destroy();
    harnesses.pop();

    // Session B: cold restart restores wallet transactions and resumes.
    const sessionB = startAppSession(
      JSON.parse(persistedTransactions) as TransactionMeta[],
    );
    await sessionB.service.resumeDeposits();

    // Poll picks up completion from the server-recorded transfer.
    nowMs += 2_000;
    jest.advanceTimersByTime(2_000);
    await flushMicrotasks();

    expect(creditCount).toBe(1);
    expect(sessionB.service.getDepositStatus(KALSHI_VENUE_ID)).toBeNull();

    const resolvedEvents = sessionB.publishSpy.mock.calls.filter(
      ([event]) => event === 'PredictFundingService:depositResolved',
    );
    expect(resolvedEvents).toHaveLength(1);
    expect(resolvedEvents[0][1]).toMatchObject({
      venueId: KALSHI_VENUE_ID,
      deposit: expect.objectContaining({
        operationId: OPERATION_ID,
        status: 'completed',
      }),
    });

    const invalidatedKeys = sessionB.invalidateSpy.mock.calls
      .filter(
        ([action]) => action === 'PredictPortfolioService:invalidateQueries',
      )
      .map(([, request]) => (request as { queryKey: unknown }).queryKey);
    expect(invalidatedKeys).toEqual([
      ['PredictPortfolioService:getBalance', KALSHI_VENUE_ID],
      ['PredictPortfolioService:getPortfolioSummary', KALSHI_VENUE_ID],
    ]);

    const finalBalance =
      await sessionB.harness.portfolioService.getBalance(KALSHI_VENUE_ID);
    expect(finalBalance.available).toBe('35.50');
  });

  it('sends no HTTP request when changeIdentity aborts while getBearerToken is held', async () => {
    let resolveToken: ((token: string) => void) | undefined;
    const fetchMock = jest.fn();
    const client = new PredictApiReadClient({
      baseUrl: 'https://api.predict.test',
      clientVersion: '1.0.0',
      getBearerToken: async () =>
        await new Promise<string>((resolve) => {
          resolveToken = resolve;
        }),
      fetch: fetchMock,
    });
    const adapter = new KalshiRemoteAdapter(client);
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      PredictFundingServiceActions,
      PredictFundingServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const messenger = getPredictFundingServiceMessenger(rootMessenger);
    const service = new PredictFundingService({
      messenger,
      funding: adapter.funding,
      venueId: adapter.venueId,
    });
    services.push(service);

    const resumePromise = service.resumeDeposits();
    await flushMicrotasks();
    expect(resolveToken).toBeDefined();

    // Logout or profile change occurs before getBearerToken resolves.
    service.changeIdentity();
    resolveToken?.('stale-or-replacement-token');
    await resumePromise;

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
