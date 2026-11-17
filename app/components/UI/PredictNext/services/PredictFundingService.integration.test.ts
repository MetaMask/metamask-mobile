import type { AppStateStatus } from 'react-native';
import {
  buildPredictNextIntegrationHarness as createPredictNextIntegrationHarness,
  routePredictApi,
} from '../../../../../tests/integration/harnesses/predict-next';
import { getPredictFundingServiceMessenger } from '../../../../core/Engine/messengers/predict-funding-service-messenger';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';
import { PredictFundingService } from './PredictFundingService';

const PREVIEW_ID = 'b3c2a1d0-1111-4222-8333-444455556666';
const PREVIEW_PATH = '/v1/venues/kalshi/withdrawals/preview';
const COMMIT_PATH = `/v1/venues/kalshi/withdrawals/${PREVIEW_ID}/commit`;
const OBSERVE_PATH = `/v1/venues/kalshi/withdrawals/${PREVIEW_ID}`;
const BALANCE_PATH = '/v1/venues/kalshi/balance';
const ACTIVITY_PATH = '/v1/venues/kalshi/activity';
const POSITIONS_PATH = '/v1/venues/kalshi/positions';

const destination = {
  address: '0xcDe7aB4E0f4a8C7c0F8aE4bD9c1D2e3F4a5B6c7D',
  network: 'base',
  source: 'configured_demo',
};

const previewBody = {
  previewId: PREVIEW_ID,
  venueId: 'kalshi',
  currency: 'USD',
  mode: 'fixed',
  requestedAmount: '5.00',
  destination,
  expiresAt: '2026-03-01T12:00:30.000Z',
  // A server-owned field the phone must mask rather than hold.
  idempotencyKey: 'server-owned-key',
};

const receiptOf = (status: string, overrides: Record<string, unknown> = {}) => ({
  operationId: '0f8a1c2b-3333-4444-8555-666677778888',
  previewId: PREVIEW_ID,
  venueId: 'kalshi',
  currency: 'USD',
  mode: 'fixed',
  status,
  needsManualReview: false,
  requestedAmount: '5.00',
  withdrawnAmount: status === 'settled' ? '5.00' : null,
  venueTransferId: status === 'settled' ? 'transfer-1' : null,
  destination,
  createdAt: '2026-03-01T12:00:10.000Z',
  resolvedAt: status === 'settled' ? '2026-03-01T12:01:10.000Z' : null,
  ...overrides,
});

const balanceBody = (available: string) => ({
  venueId: 'kalshi',
  currency: 'USD',
  available,
});

describe('PredictNext Withdraw workflow', () => {
  const harnesses: ReturnType<typeof createPredictNextIntegrationHarness>[] =
    [];
  const buildPredictNextIntegrationHarness = (
    ...args: Parameters<typeof createPredictNextIntegrationHarness>
  ) => {
    const harness = createPredictNextIntegrationHarness(...args);
    harnesses.push(harness);
    return harness;
  };

  const created: PredictFundingService[] = [];
  let appStateListener: ((state: AppStateStatus) => void) | undefined;

  /**
   * Real funding service over the harness's adapter, wired to the harness root
   * so a receipt's invalidation reaches the real portfolio service cache.
   */
  const buildService = (
    harness: ReturnType<typeof createPredictNextIntegrationHarness>,
    {
      delays = [10],
      appState = { current: 'active' as AppStateStatus },
    }: {
      delays?: readonly number[];
      appState?: { current: AppStateStatus };
    } = {},
  ) => {
    const service = new PredictFundingService({
      messenger: getPredictFundingServiceMessenger(
        harness.messenger as unknown as Parameters<
          typeof getPredictFundingServiceMessenger
        >[0],
      ),
      funding: harness.adapter.funding,
      venueId: harness.adapter.venueId,
      AppState: {
        get currentState() {
          return appState.current;
        },
        addEventListener: (
          _type: string,
          listener: (state: AppStateStatus) => void,
        ) => {
          appStateListener = listener;
          return { remove: () => undefined };
        },
      } as never,
      observationDelaysMs: delays,
    });
    created.push(service);
    return service;
  };

  const callsTo = (
    harness: ReturnType<typeof createPredictNextIntegrationHarness>,
    path: string,
  ) =>
    harness.fetchMock.mock.calls.filter(
      ([url]) => new URL(String(url)).pathname === path,
    );

  beforeEach(() => {
    // The backoff loop is the behaviour under test; advancing the clock keeps
    // every step deterministic and costs no wall time.
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    created.splice(0).forEach((service) => service.destroy());
    appStateListener = undefined;
    harnesses.splice(0).forEach((harness) => harness.destroy());
  });

  it('quotes, commits and observes one Withdrawal to a settled receipt', async () => {
    let observations = 0;
    const harness = buildPredictNextIntegrationHarness(
      routePredictApi({
        [PREVIEW_PATH]: { body: previewBody },
        [COMMIT_PATH]: { body: receiptOf('processing') },
        [OBSERVE_PATH]: () => {
          observations += 1;
          return {
            body: observations < 2 ? receiptOf('processing') : receiptOf('settled'),
          };
        },
      }),
    );
    const service = buildService(harness);
    const receipts: string[] = [];

    const preview = await service.requestWithdrawPreview(KALSHI_VENUE_ID, {
      amount: '5.00' as never,
    });
    service.followOperation(preview.previewId, {
      onReceipt: (receipt) => receipts.push(receipt.status),
    });
    await service.commitWithdrawPreview(KALSHI_VENUE_ID, preview.previewId);
    await jest.advanceTimersByTimeAsync(20);

    const [previewCall] = callsTo(harness, PREVIEW_PATH);
    expect(JSON.parse(String(previewCall[1]?.body))).toEqual({
      amount: '5.00',
    });
    const [commitCall] = callsTo(harness, COMMIT_PATH);
    expect(commitCall[1]?.body).toBe('{}');
    expect(harness.fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(PREVIEW_PATH),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-bearer-token',
        }),
      }),
    );
    // Kalshi refuses device signatures on a Withdrawal: no Venue
    // authorization header ever rides these calls.
    for (const [, init] of harness.fetchMock.mock.calls) {
      expect(
        Object.keys(init?.headers ?? {}).map((name) => name.toLowerCase()),
      ).not.toContain('venue-authorization');
    }
    expect(receipts).toEqual(['processing', 'processing', 'settled']);
  });

  it('masks server-owned Preview fields the phone must not hold', async () => {
    const harness = buildPredictNextIntegrationHarness(
      routePredictApi({ [PREVIEW_PATH]: { body: previewBody } }),
    );

    const preview = await buildService(harness).requestWithdrawPreview(
      KALSHI_VENUE_ID,
      { sweepAll: true },
    );

    expect(preview).not.toHaveProperty('idempotencyKey');
    expect(preview.destination).toEqual(destination);
  });

  it('refetches the authoritative Balance and never touches Activity or Positions rows', async () => {
    let available = '12.00';
    const harness = buildPredictNextIntegrationHarness(
      routePredictApi({
        [PREVIEW_PATH]: { body: previewBody },
        [COMMIT_PATH]: { body: receiptOf('processing') },
        [OBSERVE_PATH]: () => {
          available = '7.00';
          return { body: receiptOf('settled') };
        },
        [BALANCE_PATH]: () => ({ body: balanceBody(available) }),
      }),
    );
    const service = buildService(harness);

    await harness.portfolioService.getBalance(KALSHI_VENUE_ID);
    expect(callsTo(harness, BALANCE_PATH)).toHaveLength(1);

    const receipts: string[] = [];
    service.followOperation(PREVIEW_ID, {
      onReceipt: (receipt) => receipts.push(receipt.status),
    });
    await service.commitWithdrawPreview(KALSHI_VENUE_ID, PREVIEW_ID);
    await jest.advanceTimersByTimeAsync(30);

    expect(receipts).toEqual(['processing', 'settled']);
    // The settled receipt refreshed the cached Balance read: money moved, and
    // the UI's cache receives the venue's own number, not a local deduction.
    expect(
      (await harness.portfolioService.getBalance(KALSHI_VENUE_ID)).available,
    ).toBe('7.00');
    // One populated read, then one refetch per balance-moving transition:
    // the commit's `processing` and the observation's `settled`.
    expect(callsTo(harness, BALANCE_PATH)).toHaveLength(3);
    // A Withdrawal is a cash movement: no Activity row and no Position row is
    // fetched or written by it.
    expect(callsTo(harness, ACTIVITY_PATH)).toHaveLength(0);
    expect(callsTo(harness, POSITIONS_PATH)).toHaveLength(0);
  });

  it('never invalidates the balance reads when the venue rejects the Withdrawal', async () => {
    const harness = buildPredictNextIntegrationHarness(
      routePredictApi({
        [PREVIEW_PATH]: { body: previewBody },
        [COMMIT_PATH]: {
          body: receiptOf('rejected', {
            rejectionCode: 'step_up_verification_required',
            withdrawnAmount: null,
          }),
        },
        [BALANCE_PATH]: { body: balanceBody('12.00') },
      }),
    );
    const service = buildService(harness);
    await harness.portfolioService.getBalance(KALSHI_VENUE_ID);

    const receipt = await service.commitWithdrawPreview(
      KALSHI_VENUE_ID,
      PREVIEW_ID,
    );
    await jest.advanceTimersByTimeAsync(30);

    expect(receipt.rejectionCode).toBe('step_up_verification_required');
    // Nothing moved, so nothing is refetched and nothing is observed.
    expect(callsTo(harness, BALANCE_PATH)).toHaveLength(1);
    expect(callsTo(harness, OBSERVE_PATH)).toHaveLength(0);
  });

  it('stops observing once the backend asks for manual review', async () => {
    const harness = buildPredictNextIntegrationHarness(
      routePredictApi({
        [COMMIT_PATH]: {
          body: receiptOf('processing', { needsManualReview: true }),
        },
      }),
    );
    const service = buildService(harness);
    const receipts: string[] = [];

    service.followOperation(PREVIEW_ID, {
      onReceipt: (receipt) => receipts.push(receipt.status),
    });
    await service.commitWithdrawPreview(KALSHI_VENUE_ID, PREVIEW_ID);
    await jest.advanceTimersByTimeAsync(120);

    expect(receipts).toEqual(['processing']);
    expect(callsTo(harness, OBSERVE_PATH)).toHaveLength(0);
  });

  it('coalesces concurrent commits onto one request', async () => {
    const harness = buildPredictNextIntegrationHarness(
      routePredictApi({
        [COMMIT_PATH]: { body: receiptOf('processing') },
      }),
    );
    const service = buildService(harness);

    const [first, second] = await Promise.all([
      service.commitWithdrawPreview(KALSHI_VENUE_ID, PREVIEW_ID),
      service.commitWithdrawPreview(KALSHI_VENUE_ID, PREVIEW_ID),
    ]);

    expect(first).toBe(second);
    expect(callsTo(harness, COMMIT_PATH)).toHaveLength(1);
  });

  it('abandons observation on lock and never reads the previous person receipt', async () => {
    let observations = 0;
    const harness = buildPredictNextIntegrationHarness(
      routePredictApi({
        [COMMIT_PATH]: { body: receiptOf('processing') },
        [OBSERVE_PATH]: () => {
          observations += 1;
          return { body: receiptOf('processing') };
        },
      }),
    );
    const service = buildService(harness, { delays: [20] });
    const receipts: string[] = [];
    service.followOperation(PREVIEW_ID, {
      onReceipt: (receipt) => receipts.push(receipt.status),
    });
    await service.commitWithdrawPreview(KALSHI_VENUE_ID, PREVIEW_ID);
    await jest.advanceTimersByTimeAsync(25);
    expect(observations).toBe(1);

    service.abandonObservation();
    await jest.advanceTimersByTimeAsync(200);

    expect(observations).toBe(1);
    // The commit's own receipt plus the one observation that already landed.
    expect(receipts).toEqual(['processing', 'processing']);
  });

  it('pauses observation while the app is not active', async () => {
    let observations = 0;
    const harness = buildPredictNextIntegrationHarness(
      routePredictApi({
        [COMMIT_PATH]: { body: receiptOf('processing') },
        [OBSERVE_PATH]: () => {
          observations += 1;
          return {
            body: observations < 2 ? receiptOf('processing') : receiptOf('settled'),
          };
        },
      }),
    );
    const appState = { current: 'active' as AppStateStatus };
    const service = buildService(harness, { delays: [10], appState });
    const receipts: string[] = [];
    service.followOperation(PREVIEW_ID, {
      onReceipt: (receipt) => receipts.push(receipt.status),
    });
    await service.commitWithdrawPreview(KALSHI_VENUE_ID, PREVIEW_ID);
    await jest.advanceTimersByTimeAsync(15);
    expect(observations).toBe(1);

    appState.current = 'background';
    appStateListener?.('background');
    await jest.advanceTimersByTimeAsync(100);
    expect(observations).toBe(1);

    appState.current = 'active';
    appStateListener?.('active');
    await jest.advanceTimersByTimeAsync(15);

    expect(observations).toBe(2);
    expect(receipts).toEqual(['processing', 'processing', 'settled']);
  });
});
