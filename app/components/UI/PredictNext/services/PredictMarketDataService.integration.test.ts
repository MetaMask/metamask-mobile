import { BrokenCircuitError } from '@metamask/controller-utils';
import { buildPredictNextIntegrationHarness } from '../../../../../tests/integration/harnesses/predict-next';
import { KALSHI_VENUE_ID, type PredictEntityId } from '../types';

const status = {
  venueId: 'kalshi',
  status: 'available',
  checkedAt: '2026-03-01T00:00:00.000Z',
};

const event = {
  venueId: 'kalshi',
  id: 'event-1',
  title: 'Game outcome',
  markets: [
    {
      id: 'market-1',
      question: 'Will the team win?',
      status: 'open',
      outcomes: [
        { id: 'yes', side: 'yes', label: 'Yes', askPrice: '0.42' },
        { id: 'no', side: 'no', label: 'No', askPrice: '0.61' },
      ],
    },
  ],
};

describe('PredictNext public market data', () => {
  it('reads venue status through the real controller-to-transport chain', async () => {
    const harness = buildPredictNextIntegrationHarness(() => ({
      body: status,
    }));

    const result = await harness.messenger.call(
      'PredictMarketDataService:getVenueStatus',
      KALSHI_VENUE_ID,
    );

    expect(result).toEqual(status);
    expect(harness.fetchMock).toHaveBeenCalledTimes(1);
    harness.destroy();
  });

  it('progresses event-list pages with cursor outside stable query identity', async () => {
    const harness = buildPredictNextIntegrationHarness((url) => ({
      body: url.includes('cursor=next')
        ? { items: [{ ...event, id: 'event-2', title: 'Second event' }] }
        : { items: [event], nextCursor: 'next' },
    }));

    const first = await harness.messenger.call(
      'PredictMarketDataService:getEvents',
      KALSHI_VENUE_ID,
      { limit: 20 },
    );
    const second = await harness.messenger.call(
      'PredictMarketDataService:getEvents',
      KALSHI_VENUE_ID,
      { limit: 20 },
      first.nextCursor,
    );

    expect(first.items[0].id).toBe('event-1');
    expect(second.items[0].id).toBe('event-2');
    expect(harness.fetchMock.mock.calls[1][0]).toContain('cursor=next');
    harness.destroy();
  });

  it('deduplicates concurrent identical reads and caches immediate repeats', async () => {
    let resolveResponse: (value: { body: unknown }) => void = () => undefined;
    const response = new Promise<{ body: unknown }>((resolve) => {
      resolveResponse = resolve;
    });
    const harness = buildPredictNextIntegrationHarness(() => response);

    const first = harness.messenger.call(
      'PredictMarketDataService:getEvent',
      KALSHI_VENUE_ID,
      event.id as PredictEntityId,
    );
    const concurrent = harness.messenger.call(
      'PredictMarketDataService:getEvent',
      KALSHI_VENUE_ID,
      event.id as PredictEntityId,
    );
    resolveResponse({ body: event });
    await Promise.all([first, concurrent]);
    await harness.messenger.call(
      'PredictMarketDataService:getEvent',
      KALSHI_VENUE_ID,
      event.id as PredictEntityId,
    );

    expect(harness.fetchMock).toHaveBeenCalledTimes(1);
    harness.destroy();
  });

  it('reads venue status and Events independently without a status preflight', async () => {
    const harness = buildPredictNextIntegrationHarness((url) => ({
      body: url.endsWith('/status') ? status : { items: [event] },
    }));

    await Promise.all([
      harness.messenger.call(
        'PredictMarketDataService:getVenueStatus',
        KALSHI_VENUE_ID,
      ),
      harness.messenger.call(
        'PredictMarketDataService:getEvents',
        KALSHI_VENUE_ID,
        {},
      ),
    ]);

    expect(harness.fetchMock).toHaveBeenCalledTimes(2);
    harness.destroy();
  });

  it('makes one attempt for response identity failures', async () => {
    const harness = buildPredictNextIntegrationHarness(() => ({
      body: { ...status, venueId: 'other' },
    }));

    await expect(
      harness.messenger.call(
        'PredictMarketDataService:getVenueStatus',
        KALSHI_VENUE_ID,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });

    expect(harness.fetchMock).toHaveBeenCalledTimes(1);
    harness.destroy();
  });

  it('rejects unsupported Venues without an HTTP attempt', () => {
    const harness = buildPredictNextIntegrationHarness(() => ({
      body: status,
    }));

    const act = () =>
      harness.messenger.call(
        'PredictMarketDataService:getVenueStatus',
        'other' as typeof KALSHI_VENUE_ID,
      );

    expect(act).toThrow('This prediction venue is not supported.');
    expect(harness.fetchMock).not.toHaveBeenCalled();
    harness.destroy();
  });

  it('limits transient failures to three attempts and opens the circuit', async () => {
    const harness = buildPredictNextIntegrationHarness(() => ({ status: 503 }));

    await expect(
      harness.messenger.call(
        'PredictMarketDataService:getVenueStatus',
        KALSHI_VENUE_ID,
      ),
    ).rejects.toMatchObject({ code: 'VENUE_UNAVAILABLE' });
    await expect(
      harness.messenger.call(
        'PredictMarketDataService:getEvents',
        KALSHI_VENUE_ID,
        {},
      ),
    ).rejects.toBeInstanceOf(BrokenCircuitError);

    expect(harness.fetchMock).toHaveBeenCalledTimes(3);
    harness.destroy();
  });

  it('forwards cancellation to fetch and preserves AbortError', async () => {
    const abort = Object.assign(new Error('cancelled'), { name: 'AbortError' });
    const harness = buildPredictNextIntegrationHarness(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(abort));
        }),
    );
    const controller = new AbortController();

    const result = harness.messenger.call(
      'PredictMarketDataService:getVenueStatus',
      KALSHI_VENUE_ID,
      { signal: controller.signal },
    );
    controller.abort();

    await expect(result).rejects.toBe(abort);
    expect(harness.fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal);
    harness.destroy();
  });

  it('removes service actions on root teardown', () => {
    const harness = buildPredictNextIntegrationHarness(() => ({
      body: status,
    }));

    harness.destroy();

    expect(() =>
      harness.messenger.call(
        'PredictMarketDataService:getVenueStatus',
        KALSHI_VENUE_ID,
      ),
    ).toThrow();
  });
});
