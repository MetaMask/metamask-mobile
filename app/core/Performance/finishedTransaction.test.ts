import {
  captureException,
  Client,
  createTransport,
  getCurrentScope,
  getIsolationScope,
  parseEnvelope,
  resolvedSyncPromise,
  setCurrentClient,
  type ClientOptions,
  type Event as SentryEvent,
  type EventEnvelope,
} from '@sentry/core';
import { getCachedConsent } from '../../util/trace';
import {
  sendFinishedTransaction,
  type FinishedChildSpan,
  type FinishedSpan,
} from './finishedTransaction';

jest.mock('../../util/trace', () => ({
  getCachedConsent: jest.fn(),
}));

const mockGetCachedConsent = jest.mocked(getCachedConsent);

class TestClient extends Client<ClientOptions> {
  public constructor(options: ClientOptions) {
    super(options);
  }

  eventFromException(exception: unknown) {
    return resolvedSyncPromise<SentryEvent>({
      exception: { values: [{ type: 'Error', value: String(exception) }] },
    });
  }

  eventFromMessage(message: unknown) {
    return resolvedSyncPromise<SentryEvent>({ message: String(message) });
  }
}

const TRANSACTION: FinishedSpan = {
  name: 'Cold Start To Unlock Ready',
  op: 'startup.cold_start',
  startTime: 1_700_000_000_100,
  endTime: 1_700_000_003_300,
  tags: { 'startup.kind': 'cold', 'startup.legs_overlap': false },
  data: { 'startup.duration_ms': 3_200 },
};

const CHILDREN: FinishedChildSpan[] = [
  {
    name: 'Startup - Store Initialization',
    op: 'startup.stage',
    startTime: 1_700_000_000_500,
    endTime: 1_700_000_001_200,
    tags: { 'startup.kind': 'cold' },
    data: { 'startup.store.configure_ms': 40 },
  },
  {
    name: 'Startup - Redux Persist Rehydration',
    op: 'startup.stage',
    startTime: 1_700_000_000_700,
    endTime: 1_700_000_001_200,
    parent: 0,
  },
];

let sentEnvelopes: (string | Uint8Array)[] = [];

const initClient = (options: Partial<ClientOptions> = {}) => {
  const client = new TestClient({
    dsn: 'https://public@o1.ingest.sentry.io/1',
    integrations: [],
    stackParser: () => [],
    tracesSampleRate: 1,
    transport: (transportOptions) =>
      createTransport(transportOptions, (request) => {
        sentEnvelopes.push(request.body);
        return resolvedSyncPromise({ statusCode: 200 });
      }),
    ...options,
  });
  setCurrentClient(client);
  client.init();
  return client;
};

const getSentItems = async (client: Client) => {
  await client.flush(1_000);
  return sentEnvelopes.flatMap((body) => {
    const [headers, items] = parseEnvelope(body) as EventEnvelope;
    return items.map(([itemHeaders, payload]) => ({
      type: itemHeaders.type,
      event: payload as SentryEvent,
      trace: headers.trace,
    }));
  });
};

const getSentTransactions = async (client: Client) =>
  (await getSentItems(client)).filter(({ type }) => type === 'transaction');

describe('sendFinishedTransaction', () => {
  beforeEach(() => {
    sentEnvelopes = [];
    mockGetCachedConsent.mockReturnValue(true);
  });

  afterEach(() => {
    getCurrentScope().setClient(undefined);
  });

  it('sends the spans as one transaction event, with times in seconds', async () => {
    const client = initClient();

    sendFinishedTransaction(TRANSACTION, CHILDREN);

    const [{ event }] = await getSentTransactions(client);
    expect(event).toMatchObject({
      type: 'transaction',
      transaction: 'Cold Start To Unlock Ready',
      transaction_info: { source: 'custom' },
      start_timestamp: 1_700_000_000.1,
      timestamp: 1_700_000_003.3,
      tags: { 'startup.kind': 'cold', 'startup.legs_overlap': false },
      contexts: {
        trace: {
          op: 'startup.cold_start',
          origin: 'manual',
          data: {
            'sentry.op': 'startup.cold_start',
            'sentry.origin': 'manual',
            'sentry.source': 'custom',
            'sentry.sample_rate': 1,
            'startup.kind': 'cold',
            'startup.legs_overlap': false,
            'startup.duration_ms': 3_200,
          },
        },
      },
    });
  });

  it('puts each child under its parent, or under the transaction', async () => {
    const client = initClient();

    sendFinishedTransaction(TRANSACTION, CHILDREN);

    const [{ event }] = await getSentTransactions(client);
    const trace = event.contexts?.trace;
    const [store, persist] = event.spans ?? [];
    expect(store).toMatchObject({
      trace_id: trace?.trace_id,
      parent_span_id: trace?.span_id,
      description: 'Startup - Store Initialization',
      op: 'startup.stage',
      origin: 'manual',
      start_timestamp: 1_700_000_000.5,
      timestamp: 1_700_000_001.2,
      data: {
        'sentry.op': 'startup.stage',
        'sentry.origin': 'manual',
        'startup.kind': 'cold',
        'startup.store.configure_ms': 40,
      },
    });
    expect(persist).toMatchObject({
      trace_id: trace?.trace_id,
      parent_span_id: store.span_id,
      description: 'Startup - Redux Persist Rehydration',
      start_timestamp: 1_700_000_000.7,
      timestamp: 1_700_000_001.2,
    });
  });

  it('sends it as a new trace, with its sampling decision', async () => {
    const client = initClient();

    sendFinishedTransaction(TRANSACTION);

    const [{ event, trace }] = await getSentTransactions(client);
    expect(trace).toEqual({
      environment: 'production',
      public_key: 'public',
      org_id: '1',
      trace_id: event.contexts?.trace?.trace_id,
      transaction: 'Cold Start To Unlock Ready',
      sampled: 'true',
      sample_rand: expect.any(String),
      sample_rate: '1',
    });
  });

  it('starts no span and leaves its tags off later events', async () => {
    const client = initClient();
    const onSpanStart = jest.fn();
    const onSpanEnd = jest.fn();
    client.on('spanStart', onSpanStart);
    client.on('spanEnd', onSpanEnd);

    sendFinishedTransaction(TRANSACTION, CHILDREN);
    captureException(new Error('Later error'));

    const error = (await getSentItems(client)).find(
      ({ type }) => type === 'event',
    );
    expect(onSpanStart).not.toHaveBeenCalled();
    expect(onSpanEnd).not.toHaveBeenCalled();
    expect(getIsolationScope().getScopeData().tags).toEqual({});
    expect(error?.event.exception?.values?.[0].value).toBe(
      'Error: Later error',
    );
    expect(error?.event.tags).toBeUndefined();
  });

  it('records a dropped transaction when it is not sampled', async () => {
    const client = initClient({ tracesSampleRate: 0 });
    const recordDroppedEvent = jest.spyOn(client, 'recordDroppedEvent');

    sendFinishedTransaction(TRANSACTION, CHILDREN);

    expect(await getSentTransactions(client)).toEqual([]);
    expect(recordDroppedEvent).toHaveBeenCalledWith(
      'sample_rate',
      'transaction',
    );
  });

  it('sends nothing when tracing is off', async () => {
    const client = initClient({ tracesSampleRate: undefined });
    const recordDroppedEvent = jest.spyOn(client, 'recordDroppedEvent');

    sendFinishedTransaction(TRANSACTION, CHILDREN);

    expect(await getSentTransactions(client)).toEqual([]);
    expect(recordDroppedEvent).not.toHaveBeenCalled();
  });

  it.each([
    { consent: 'unknown', value: null },
    { consent: 'declined', value: false },
  ])('sends nothing while consent is $consent', async ({ value }) => {
    mockGetCachedConsent.mockReturnValue(value);
    const client = initClient();
    const recordDroppedEvent = jest.spyOn(client, 'recordDroppedEvent');

    sendFinishedTransaction(TRANSACTION, CHILDREN);

    expect(await getSentTransactions(client)).toEqual([]);
    expect(recordDroppedEvent).not.toHaveBeenCalled();
  });

  it('does nothing without a Sentry client', () => {
    expect(() => sendFinishedTransaction(TRANSACTION, CHILDREN)).not.toThrow();
  });
});
