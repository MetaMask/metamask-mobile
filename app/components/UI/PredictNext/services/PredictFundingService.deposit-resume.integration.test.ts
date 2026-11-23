import type { TransactionMeta } from '@metamask/transaction-controller';
import {
  buildPredictNextIntegrationHarness as createPredictNextIntegrationHarness,
  routePredictApi,
  type PredictNextIntegrationHarness,
} from '../../../../../tests/integration/harnesses/predict-next';
import { getPredictFundingServiceMessenger } from '../../../../core/Engine/messengers/predict-funding-service-messenger';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';
import awaitingTransfer from '../contracts/v1/fixtures/funding-contract/awaiting-transfer.json';
import credited from '../contracts/v1/fixtures/funding-contract/credited.json';
import transferReported from '../contracts/v1/fixtures/funding-contract/transfer-reported.json';
import {
  flushMicrotasks,
  makeDepositTransferTx,
} from '../funding/deposit/testUtils';
import type { PredictHex } from '../types';
import { PredictFundingService } from './PredictFundingService';

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
});
