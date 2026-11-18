import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  buildPredictNextIntegrationHarness as createPredictNextIntegrationHarness,
  type PredictFetchResult,
  type PredictNextIntegrationHarness,
} from '../../../../../tests/integration/harnesses/predict-next';
import { PredictErrorCode } from '../errors';
import { portfolioQueryFamilies } from '../queries/portfolioQueries';
import type { PredictAmount } from '../types';
import {
  PREDICT_FUNDING_SERVICE_NAME,
  PredictFundingService,
  type PredictFundingServiceActions,
  type PredictFundingServiceEvents,
  type PredictFundingServiceMessenger,
} from './PredictFundingService';

const PREVIEW_ID = 'b3c2a1d0-1111-4222-8333-444455556666';
const PREVIEW_PATH = '/v1/venues/kalshi/withdrawals/preview';
const COMMIT_PATH = `/v1/venues/kalshi/withdrawals/${PREVIEW_ID}/commit`;
const OBSERVE_PATH = `/v1/venues/kalshi/withdrawals/${PREVIEW_ID}`;

const receiptPayload = {
  operationId: '0f8a1c2b-3333-4444-8555-666677778888',
  previewId: PREVIEW_ID,
  venueId: 'kalshi',
  currency: 'USD',
  mode: 'fixed',
  status: 'processing',
  needsManualReview: false,
  requestedAmount: '5.00',
  withdrawnAmount: null,
  venueTransferId: null,
  destination: {
    address: '0xcDe7aB4E0f4a8C7c0F8aE4bD9c1D2e3F4a5B6c7D',
    network: 'base',
    source: 'configured_demo',
  },
  createdAt: '2026-03-01T12:00:10.000Z',
  resolvedAt: null,
};

const previewPayload = {
  previewId: PREVIEW_ID,
  venueId: 'kalshi',
  currency: 'USD',
  mode: 'fixed',
  requestedAmount: '5.00',
  destination: receiptPayload.destination,
  expiresAt: '2099-03-01T12:01:00.000Z',
};

// ES2022 has no Promise.withResolvers; keep test barriers explicit.
interface Deferred<Value> {
  promise: Promise<Value>;
  resolve: (value: Value) => void;
}

const deferred = <Value>(): Deferred<Value> => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const deferTokenTo = (
  harness: PredictNextIntegrationHarness,
  requested: Deferred<void>,
  token: Deferred<string | undefined>,
): void => {
  harness.getBearerTokenMock.mockImplementationOnce(() => {
    requested.resolve(undefined);
    return token.promise;
  });
};

const commitResponder = (url: string): PredictFetchResult =>
  String(url).endsWith(COMMIT_PATH)
    ? { body: receiptPayload }
    : { status: 404, body: { code: 'not_found' } };

const observeResponder = (url: string): PredictFetchResult =>
  String(url).endsWith(OBSERVE_PATH)
    ? { body: receiptPayload }
    : { status: 404, body: { code: 'not_found' } };

describe('PredictFundingService withdrawal transport', () => {
  const harnesses: PredictNextIntegrationHarness[] = [];
  const services: PredictFundingService[] = [];
  const invalidateQueries = jest.fn<Promise<void>, [unknown]>();

  const buildHarness = (
    responder: Parameters<typeof createPredictNextIntegrationHarness>[0],
  ) => {
    const harness = createPredictNextIntegrationHarness((url, init) =>
      String(url).endsWith(PREVIEW_PATH)
        ? { body: previewPayload }
        : responder(url, init),
    );
    // Nothing reads the bearer token while the harness is built.
    harness.getBearerTokenMock.mockClear();
    harnesses.push(harness);
    return harness;
  };

  const buildService = (harness: PredictNextIntegrationHarness) => {
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      PredictFundingServiceActions,
      PredictFundingServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    rootMessenger.registerActionHandler(
      'PredictPortfolioService:invalidateQueries',
      invalidateQueries,
    );
    const messenger: PredictFundingServiceMessenger = new Messenger({
      namespace: PREDICT_FUNDING_SERVICE_NAME,
      parent: rootMessenger,
    });
    rootMessenger.delegate({
      actions: ['PredictPortfolioService:invalidateQueries'],
      events: [],
      messenger,
    });
    const service = new PredictFundingService({
      messenger,
      funding: harness.adapter.funding,
      venueId: harness.adapter.venueId,
    });
    services.push(service);
    return service;
  };

  const buildQuotedService = async (harness: PredictNextIntegrationHarness) => {
    const service = buildService(harness);
    await service.requestWithdrawPreview(harness.adapter.venueId, {
      amount: previewPayload.requestedAmount as PredictAmount,
    });
    harness.fetchMock.mockClear();
    return service;
  };

  beforeEach(() => {
    invalidateQueries.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    services.splice(0).forEach((service) => service.destroy());
    harnesses.splice(0).forEach((harness) => harness.destroy());
  });

  it('never dispatches a Commit whose token resolves after abandonment', async () => {
    const harness = buildHarness(commitResponder);
    const service = await buildQuotedService(harness);
    const token = deferred<string | undefined>();
    const tokenRequested = deferred<void>();
    deferTokenTo(harness, tokenRequested, token);

    const commit = service.commitWithdrawPreview(
      harness.adapter.venueId,
      PREVIEW_ID,
    );
    await tokenRequested.promise;
    service.changeIdentity();
    token.resolve('replaced-bearer-token');

    await expect(commit).rejects.toMatchObject({
      code: PredictErrorCode.UNAUTHENTICATED,
    });
    expect(harness.fetchMock).not.toHaveBeenCalled();
  });

  it('shares one POST even when the second caller aborts while resolving its token', async () => {
    const harness = buildHarness(commitResponder);
    const service = await buildQuotedService(harness);
    const token = deferred<string | undefined>();
    const tokenRequested = deferred<void>();
    deferTokenTo(harness, tokenRequested, token);
    const caller = new AbortController();

    const commit = service.commitWithdrawPreview(
      harness.adapter.venueId,
      PREVIEW_ID,
    );
    const second = service.commitWithdrawPreview(
      harness.adapter.venueId,
      PREVIEW_ID,
      { signal: caller.signal },
    );
    const cancelled = expect(second).rejects.toMatchObject({
      name: 'AbortError',
    });
    await tokenRequested.promise;
    caller.abort();
    await cancelled;
    token.resolve('caller-token');

    await expect(commit).resolves.toMatchObject({
      previewId: PREVIEW_ID,
      status: 'processing',
    });
    expect(harness.fetchMock).toHaveBeenCalledTimes(1);
    expect(harness.fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false);
    expect(invalidateQueries).toHaveBeenCalled();
  });

  it('keeps a dispatched Commit alive across lock and shares its receipt', async () => {
    const response = deferred<PredictFetchResult>();
    const fetchRequested = deferred<void>();
    const harness = buildHarness(() => {
      fetchRequested.resolve(undefined);
      return response.promise;
    });
    const service = await buildQuotedService(harness);
    const commit = service.commitWithdrawPreview(
      harness.adapter.venueId,
      PREVIEW_ID,
    );
    await fetchRequested.promise;

    service.stopObserving();

    expect(harness.fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false);
    expect(
      service.commitWithdrawPreview(harness.adapter.venueId, PREVIEW_ID),
    ).toBe(commit);
    response.resolve({ body: receiptPayload });
    await expect(commit).resolves.toMatchObject({ status: 'processing' });
    expect(harness.fetchMock).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalled();
  });

  it('does not invalidate reads when an answer lands after abandonment', async () => {
    const response = deferred<PredictFetchResult>();
    const fetchRequested = deferred<void>();
    const harness = buildHarness(() => {
      fetchRequested.resolve(undefined);
      return response.promise;
    });
    const service = await buildQuotedService(harness);

    const commit = service.commitWithdrawPreview(
      harness.adapter.venueId,
      PREVIEW_ID,
    );
    await fetchRequested.promise;
    service.changeIdentity();
    expect(harness.fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false);
    response.resolve({ body: receiptPayload });

    await expect(commit).rejects.toMatchObject({
      code: PredictErrorCode.UNAUTHENTICATED,
    });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('commits normally and detaches the caller cancellation afterwards', async () => {
    const harness = buildHarness(commitResponder);
    const service = await buildQuotedService(harness);
    const caller = new AbortController();

    const result = await service.commitWithdrawPreview(
      harness.adapter.venueId,
      PREVIEW_ID,
      { signal: caller.signal },
    );

    const [url, init] = harness.fetchMock.mock.calls[0];
    const transportSignal = init?.signal;
    expect(String(url)).toContain(COMMIT_PATH);
    expect(init?.method).toBe('POST');
    expect(transportSignal).toBeInstanceOf(AbortSignal);
    expect(transportSignal?.aborted).toBe(false);
    expect(result).toMatchObject({
      previewId: PREVIEW_ID,
      status: 'processing',
    });
    expect(invalidateQueries.mock.calls).toEqual(
      portfolioQueryFamilies(harness.adapter.venueId).map((queryKey) => [
        { queryKey },
      ]),
    );

    caller.abort();
    expect(transportSignal?.aborted).toBe(false);
  });

  it('never dispatches an observation whose token resolves after abandonment', async () => {
    // The GET can replay a stored submission, so it is not a harmless read.
    const harness = buildHarness(observeResponder);
    const token = deferred<string | undefined>();
    const tokenRequested = deferred<void>();
    deferTokenTo(harness, tokenRequested, token);
    const service = buildService(harness);

    const observation = service.observeWithdraw(
      harness.adapter.venueId,
      PREVIEW_ID,
    );
    await tokenRequested.promise;
    service.changeIdentity();
    token.resolve('replaced-bearer-token');

    await expect(observation).rejects.toMatchObject({
      code: PredictErrorCode.UNAUTHENTICATED,
    });
    expect(harness.fetchMock).not.toHaveBeenCalled();
  });

  it('cancels an observation waiting on its token when the caller aborts', async () => {
    const harness = buildHarness(observeResponder);
    const token = deferred<string | undefined>();
    const tokenRequested = deferred<void>();
    deferTokenTo(harness, tokenRequested, token);
    const service = buildService(harness);
    const caller = new AbortController();

    const observation = service.observeWithdraw(
      harness.adapter.venueId,
      PREVIEW_ID,
      { signal: caller.signal },
    );
    await tokenRequested.promise;
    caller.abort();
    token.resolve('caller-token');

    await expect(observation).rejects.toMatchObject({ name: 'AbortError' });
    expect(harness.fetchMock).not.toHaveBeenCalled();
  });

  it('observes normally and detaches the caller cancellation afterwards', async () => {
    const harness = buildHarness(observeResponder);
    const service = buildService(harness);
    const caller = new AbortController();

    const result = await service.observeWithdraw(
      harness.adapter.venueId,
      PREVIEW_ID,
      { signal: caller.signal },
    );

    const [url, init] = harness.fetchMock.mock.calls[0];
    const transportSignal = init?.signal;
    expect(String(url)).toContain(OBSERVE_PATH);
    expect(init?.method).toBe('GET');
    expect(transportSignal).toBeInstanceOf(AbortSignal);
    expect(transportSignal?.aborted).toBe(false);
    expect(result).toMatchObject({
      previewId: PREVIEW_ID,
      status: 'processing',
    });

    caller.abort();
    expect(transportSignal?.aborted).toBe(false);
  });
});
