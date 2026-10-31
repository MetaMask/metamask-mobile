import { buildPredictVenueIntegrationHarness } from '../../../../../tests/integration/harnesses/predict-next';

const WAIT_MS = 50;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('PredictVenueController with the Engine-start geolocation fetch', () => {
  let harness: ReturnType<typeof buildPredictVenueIntegrationHarness>;

  afterEach(() => {
    harness.destroy();
  });

  it('latches the regional default from the one Engine-start fetch', async () => {
    harness = buildPredictVenueIntegrationHarness({
      geolocationWaitMs: WAIT_MS,
    });

    await harness.respondWithCountry('US');
    await wait(WAIT_MS * 2);

    expect(harness.venueController.state.sessionDefault).toEqual({
      venue: 'kalshi',
      source: 'geolocation',
    });
    expect(harness.geolocationFetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the last Active Venue when the fetch fails', async () => {
    harness = buildPredictVenueIntegrationHarness({
      geolocationWaitMs: WAIT_MS,
      persisted: { lastActiveVenue: 'kalshi' },
    });

    await harness.failGeolocation();

    expect(harness.geolocationController.state.status).toBe('error');
    expect(harness.venueController.state.sessionDefault).toEqual({
      venue: 'kalshi',
      source: 'lastActiveVenue',
    });
    expect(harness.geolocationFetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the timed-out fallback for the session and applies a late location next session', async () => {
    harness = buildPredictVenueIntegrationHarness({
      geolocationWaitMs: WAIT_MS,
    });
    await wait(WAIT_MS * 2);

    await harness.respondWithCountry('US');

    expect(harness.geolocationController.state.location).toBe('US');
    expect(harness.venueController.state.sessionDefault).toEqual({
      venue: 'polymarket',
      source: 'fallback',
    });
    const persisted = harness.persistedVenueState();
    harness.destroy();

    harness = buildPredictVenueIntegrationHarness({
      geolocationWaitMs: WAIT_MS,
      persisted,
    });
    await harness.respondWithCountry('US');

    expect(harness.venueController.state.sessionDefault).toEqual({
      venue: 'kalshi',
      source: 'geolocation',
    });
  });
});
