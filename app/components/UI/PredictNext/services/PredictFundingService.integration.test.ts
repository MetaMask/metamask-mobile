import {
  buildPredictNextIntegrationHarness as createPredictNextIntegrationHarness,
  routePredictApi,
  type PredictNextIntegrationHarness,
  type PredictFetchResult,
} from '../../../../../tests/integration/harnesses/predict-next';
import { getPredictFundingServiceMessenger } from '../../../../core/Engine/messengers/predict-funding-service-messenger';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';
import { PredictFundingService } from './PredictFundingService';
import { PredictErrorCode } from '../errors';
import type { PredictAmount } from '../types';
import { portfolioQueryFamilies } from '../queries/portfolioQueries';

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

const receiptOf = (
  status: string,
  overrides: Record<string, unknown> = {},
) => ({
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
  const harnesses: PredictNextIntegrationHarness[] = [];
  const created: PredictFundingService[] = [];
  const dispatches = new Map<PredictFundingService, jest.SpyInstance>();
  const buildHarness = (
    ...args: Parameters<typeof createPredictNextIntegrationHarness>
  ) => {
    const harness = createPredictNextIntegrationHarness(...args);
    harnesses.push(harness);
    return harness;
  };
  const buildService = (harness: PredictNextIntegrationHarness) => {
    const messenger = getPredictFundingServiceMessenger(
      harness.messenger as unknown as Parameters<
        typeof getPredictFundingServiceMessenger
      >[0],
    );
    const dispatch = jest.spyOn(messenger, 'call');
    const service = new PredictFundingService({
      messenger,
      funding: harness.adapter.funding,
      venueId: harness.adapter.venueId,
    });
    dispatches.set(service, dispatch);
    created.push(service);
    return service;
  };
  const dispatchOf = (service: PredictFundingService) => {
    const dispatch = dispatches.get(service);
    if (!dispatch) {
      throw new Error('this Withdraw service was not built by the harness');
    }
    return dispatch;
  };
  const callsTo = (harness: PredictNextIntegrationHarness, path: string) =>
    harness.fetchMock.mock.calls.filter(
      ([url]) => new URL(String(url)).pathname === path,
    );

  afterEach(() => {
    created.splice(0).forEach((service) => service.destroy());
    harnesses.splice(0).forEach((harness) => harness.destroy());
    jest.restoreAllMocks();
  });

  it('quotes, commits and explicitly reads one Withdrawal to a settled receipt', async () => {
    let observations = 0;
    const harness = buildHarness(
      routePredictApi({
        [PREVIEW_PATH]: { body: previewBody },
        [COMMIT_PATH]: { body: receiptOf('processing') },
        [OBSERVE_PATH]: () => ({
          body: receiptOf(++observations < 2 ? 'processing' : 'settled'),
        }),
      }),
    );
    const service = buildService(harness);

    const preview = await service.requestWithdrawPreview(KALSHI_VENUE_ID, {
      amount: '5.00' as PredictAmount,
    });
    const committed = await service.commitWithdrawPreview(
      KALSHI_VENUE_ID,
      preview.previewId,
    );
    const processing = await service.observeWithdraw(
      KALSHI_VENUE_ID,
      preview.previewId,
    );
    const settled = await service.observeWithdraw(
      KALSHI_VENUE_ID,
      preview.previewId,
    );

    expect([committed.status, processing.status, settled.status]).toEqual([
      'processing',
      'processing',
      'settled',
    ]);
    expect(settled.withdrawnAmount).toBe('5.00');
    expect(settled.destination).toEqual(destination);
    const [previewCall] = callsTo(harness, PREVIEW_PATH);
    expect(JSON.parse(String(previewCall[1]?.body))).toEqual({
      amount: '5.00',
    });
    const [commitCall] = callsTo(harness, COMMIT_PATH);
    expect(commitCall[1]).toMatchObject({ method: 'POST', body: '{}' });
    expect(callsTo(harness, COMMIT_PATH)).toHaveLength(1);
    expect(callsTo(harness, OBSERVE_PATH)).toHaveLength(2);
    for (const [, init] of callsTo(harness, OBSERVE_PATH)) {
      expect(init?.method).toBe('GET');
      expect(init?.body).toBeUndefined();
    }
    expect(harness.fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(PREVIEW_PATH),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-bearer-token',
        }),
      }),
    );
    for (const [, init] of harness.fetchMock.mock.calls) {
      expect(
        Object.keys(init?.headers ?? {}).map((name) => name.toLowerCase()),
      ).not.toContain('venue-authorization');
    }
  });

  it('masks server-owned fields and preserves the backend destination', async () => {
    const harness = buildHarness(
      routePredictApi({
        [PREVIEW_PATH]: {
          body: {
            ...previewBody,
            mode: 'sweep_all',
            requestedAmount: undefined,
          },
        },
        [COMMIT_PATH]: {
          body: receiptOf('processing', { idempotencyKey: 'server-owned-key' }),
        },
      }),
    );
    const service = buildService(harness);

    const preview = await service.requestWithdrawPreview(KALSHI_VENUE_ID, {
      sweepAll: true,
    });
    const receipt = await service.commitWithdrawPreview(
      KALSHI_VENUE_ID,
      preview.previewId,
    );

    expect(preview).not.toHaveProperty('idempotencyKey');
    expect(receipt).not.toHaveProperty('idempotencyKey');
    expect(preview.destination).toEqual(destination);
    expect(receipt.destination).toEqual(destination);
    expect(preview.mode).toBe('sweep_all');
    expect(
      JSON.parse(String(callsTo(harness, PREVIEW_PATH)[0][1]?.body)),
    ).toEqual({ sweepAll: true });
  });

  it('invalidates on processing and settled exactly once each and refetches the authoritative balance', async () => {
    let available = '12.00';
    const harness = buildHarness(
      routePredictApi({
        [COMMIT_PATH]: { body: receiptOf('processing') },
        [OBSERVE_PATH]: { body: receiptOf('settled') },
        [BALANCE_PATH]: () => ({ body: balanceBody(available) }),
      }),
    );
    const service = buildService(harness);
    const dispatch = dispatchOf(service);
    const invalidationCalls = () =>
      dispatch.mock.calls
        .filter(
          ([action]) => action === 'PredictPortfolioService:invalidateQueries',
        )
        .map(([, request]) => [request]);
    const families = portfolioQueryFamilies(KALSHI_VENUE_ID).map((queryKey) => [
      { queryKey },
    ]);
    await harness.portfolioService.getBalance(KALSHI_VENUE_ID);

    await service.commitWithdrawPreview(KALSHI_VENUE_ID, PREVIEW_ID);
    expect(invalidationCalls()).toEqual(families);
    available = '7.00';
    await service.observeWithdraw(KALSHI_VENUE_ID, PREVIEW_ID);
    await service.observeWithdraw(KALSHI_VENUE_ID, PREVIEW_ID);
    const balance = await harness.portfolioService.getBalance(KALSHI_VENUE_ID);

    expect(invalidationCalls()).toEqual([...families, ...families]);
    expect(balance.available).toBe('7.00');
    expect(callsTo(harness, ACTIVITY_PATH)).toHaveLength(0);
    expect(callsTo(harness, POSITIONS_PATH)).toHaveLength(0);
  });

  it('preserves a refused commit across subsequent receipt reads without invalidating', async () => {
    const refusal = receiptOf('rejected', {
      rejectionCode: 'step_up_verification_required',
    });
    const harness = buildHarness(
      routePredictApi({
        [PREVIEW_PATH]: { body: previewBody },
        [COMMIT_PATH]: { body: refusal },
        [OBSERVE_PATH]: { body: refusal },
        [BALANCE_PATH]: { body: balanceBody('12.00') },
      }),
    );
    const service = buildService(harness);
    const dispatch = dispatchOf(service);
    await harness.portfolioService.getBalance(KALSHI_VENUE_ID);

    const preview = await service.requestWithdrawPreview(KALSHI_VENUE_ID, {
      amount: '5.00' as PredictAmount,
    });
    const committed = await service.commitWithdrawPreview(
      KALSHI_VENUE_ID,
      preview.previewId,
    );
    const observed = await service.observeWithdraw(
      KALSHI_VENUE_ID,
      preview.previewId,
    );
    const balance = await harness.portfolioService.getBalance(KALSHI_VENUE_ID);

    expect(committed).toMatchObject({
      status: 'rejected',
      rejectionCode: 'step_up_verification_required',
    });
    expect(observed).toEqual(committed);
    expect(
      dispatch.mock.calls.filter(
        ([action]) => action === 'PredictPortfolioService:invalidateQueries',
      ),
    ).toEqual([]);
    expect(balance.available).toBe('12.00');
    expect(callsTo(harness, BALANCE_PATH)).toHaveLength(1);
  });

  it('discards an in-flight receipt after abandon without invalidating', async () => {
    let release!: (value: PredictFetchResult) => void;
    let started!: () => void;
    const requested = new Promise<void>((resolve) => {
      started = resolve;
    });
    const response = new Promise<PredictFetchResult>((resolve) => {
      release = resolve;
    });
    const harness = buildHarness(async () => {
      started();
      return response;
    });
    const service = buildService(harness);
    const dispatch = dispatchOf(service);

    const pending = service.observeWithdraw(KALSHI_VENUE_ID, PREVIEW_ID);
    await requested;
    service.abandon();
    release({ body: receiptOf('settled') });

    await expect(pending).rejects.toMatchObject({
      code: PredictErrorCode.UNAUTHENTICATED,
    });
    expect(
      dispatch.mock.calls.filter(
        ([action]) => action === 'PredictPortfolioService:invalidateQueries',
      ),
    ).toEqual([]);
    expect(callsTo(harness, OBSERVE_PATH)).toHaveLength(1);
    expect(callsTo(harness, COMMIT_PATH)).toHaveLength(0);
  });
});
