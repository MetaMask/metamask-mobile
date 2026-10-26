import type { PredictConfig } from '../config/predictConfig';
import { resolveActiveVenue } from './activeVenue';

const config = (polymarket: boolean, kalshi: boolean): PredictConfig => ({
  enabled: true,
  venues: {
    polymarket: { enabled: polymarket },
    kalshi: { enabled: kalshi },
  },
  venueSelection: { enabled: false },
});

describe('temporary Active Venue resolution', () => {
  it.each([
    [false, true, 'kalshi'],
    [true, false, 'polymarket'],
    [true, true, 'polymarket'],
    [false, false, 'polymarket'],
  ] as const)(
    'resolves polymarket=%s kalshi=%s to %s',
    (polymarket, kalshi, expected) => {
      const result = resolveActiveVenue(config(polymarket, kalshi));

      expect(result).toBe(expected);
    },
  );

  it('falls back to Polymarket when the new architecture is disabled', () => {
    const disabled = { ...config(false, true), enabled: false };

    const result = resolveActiveVenue(disabled);

    expect(result).toBe('polymarket');
  });
});
