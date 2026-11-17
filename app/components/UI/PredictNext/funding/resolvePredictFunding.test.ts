import type { PredictVenueCapabilities } from '../capabilities/types';
import type {
  ActiveVenueResolution,
  PredictConfiguredVenue,
} from '../implementation/types';
import type { PredictVenueAction, PredictVenueId } from '../types';
import { PREDICT_FUNDING_IMPLEMENTATIONS } from './fundingImplementations';
import { resolvePredictFunding } from './resolvePredictFunding';
import type { PredictFundingAction } from './types';

const descriptor = (
  venueId: PredictConfiguredVenue,
  actions: PredictVenueAction[],
): PredictVenueCapabilities => ({
  status: 'ready',
  descriptor: {
    venueId: venueId as PredictVenueId,
    actions,
    feeds: {},
    categories: [],
    searchSupported: false,
    displayName: venueId,
  },
});

const active = (venue: PredictConfiguredVenue): ActiveVenueResolution => ({
  status: 'ready',
  venue,
  source: 'rollout',
});

const FUNDING_ACTIONS: PredictFundingAction[] = ['deposit', 'withdraw'];

describe('resolvePredictFunding', () => {
  it.each(FUNDING_ACTIONS)(
    'runs %s on the legacy implementation while Polymarket is active and its descriptor lists it',
    (action) => {
      const result = resolvePredictFunding(action, {
        available: true,
        activeVenue: active('polymarket'),
        getCapabilities: () => descriptor('polymarket', [action]),
      });

      expect(result).toStrictEqual({
        status: 'ready',
        implementation: 'legacy',
      });
    },
  );

  it.each(FUNDING_ACTIONS)(
    'offers no %s while the Active Venue is resolving',
    (action) => {
      const result = resolvePredictFunding(action, {
        available: true,
        activeVenue: { status: 'resolving' },
        getCapabilities: () => descriptor('polymarket', [action]),
      });

      expect(result).toStrictEqual({
        status: 'unavailable',
        reason: 'resolving',
      });
    },
  );

  it.each(FUNDING_ACTIONS)(
    'offers no %s while Predict is unavailable for the Active Venue',
    (action) => {
      const result = resolvePredictFunding(action, {
        available: false,
        activeVenue: active('polymarket'),
        getCapabilities: () => descriptor('polymarket', [action]),
      });

      expect(result).toStrictEqual({
        status: 'unavailable',
        reason: 'unavailable',
      });
    },
  );

  it.each(FUNDING_ACTIONS)(
    'offers no %s when the descriptor does not list it',
    (action) => {
      const result = resolvePredictFunding(action, {
        available: true,
        activeVenue: active('polymarket'),
        getCapabilities: () => descriptor('polymarket', ['buy', 'sell']),
      });

      expect(result).toStrictEqual({
        status: 'unavailable',
        reason: 'unsupported',
      });
    },
  );

  it('offers nothing while the Venue capabilities are not resolved', () => {
    const result = resolvePredictFunding('deposit', {
      available: true,
      activeVenue: active('polymarket'),
      getCapabilities: () => ({ status: 'loading' }),
    });

    expect(result).toStrictEqual({
      status: 'unavailable',
      reason: 'unsupported',
    });
  });

  describe('while Kalshi is active', () => {
    it.each(FUNDING_ACTIONS)(
      'offers no %s from its current descriptor',
      (action) => {
        const result = resolvePredictFunding(action, {
          available: true,
          activeVenue: active('kalshi'),
          getCapabilities: () => descriptor('kalshi', ['buy', 'sell']),
        });

        expect(result.status).toBe('unavailable');
      },
    );

    it.each(FUNDING_ACTIONS)(
      'offers no %s even when its descriptor lists it, until this client has the flow',
      (action) => {
        const result = resolvePredictFunding(action, {
          available: true,
          activeVenue: active('kalshi'),
          getCapabilities: () => descriptor('kalshi', ['buy', 'sell', action]),
        });

        expect(PREDICT_FUNDING_IMPLEMENTATIONS.next).not.toContain(action);
        expect(result).toStrictEqual({
          status: 'unavailable',
          reason: 'notImplemented',
        });
      },
    );

    it.each(FUNDING_ACTIONS)(
      'runs %s on the next implementation once both the client flow and the descriptor exist',
      (action) => {
        const result = resolvePredictFunding(
          action,
          {
            available: true,
            activeVenue: active('kalshi'),
            getCapabilities: () =>
              descriptor('kalshi', ['buy', 'sell', action]),
          },
          { ...PREDICT_FUNDING_IMPLEMENTATIONS, next: [action] },
        );

        expect(result).toStrictEqual({
          status: 'ready',
          implementation: 'next',
        });
      },
    );

    it.each(FUNDING_ACTIONS)(
      'offers no %s when the client flow exists but the descriptor does not list it',
      (action) => {
        const result = resolvePredictFunding(
          action,
          {
            available: true,
            activeVenue: active('kalshi'),
            getCapabilities: () => descriptor('kalshi', ['buy', 'sell']),
          },
          { ...PREDICT_FUNDING_IMPLEMENTATIONS, next: [action] },
        );

        expect(result).toStrictEqual({
          status: 'unavailable',
          reason: 'unsupported',
        });
      },
    );
  });
});
