import { resolveVenueImplementation } from './venueImplementations';

describe('resolveVenueImplementation', () => {
  it('serves Polymarket from the legacy implementation', () => {
    const result = resolveVenueImplementation({
      status: 'ready',
      venue: 'polymarket',
    });

    expect(result).toEqual({ status: 'ready', implementation: 'legacy' });
  });

  it('serves Kalshi from the next implementation with its Venue', () => {
    const result = resolveVenueImplementation({
      status: 'ready',
      venue: 'kalshi',
    });

    expect(result).toEqual({
      status: 'ready',
      implementation: 'next',
      venueId: 'kalshi',
    });
  });

  it('stays resolving while the Active Venue resolves', () => {
    const result = resolveVenueImplementation({ status: 'resolving' });

    expect(result).toEqual({ status: 'resolving' });
  });
});
