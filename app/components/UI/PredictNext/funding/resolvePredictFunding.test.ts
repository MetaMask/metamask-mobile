import type { PredictVenueCapabilities } from '../capabilities/types';
import type { PredictVenueFeatures } from '../config/predictConfig';
import type {
  ActiveVenueResolution,
  PredictConfiguredVenue,
} from '../implementation/types';
import type { PredictVenueAction, PredictVenueId } from '../types';
import { KALSHI_STATIC_VENUE_CATALOG } from '../config/venueCatalogs';
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
        getVenueFeatures: () => undefined,
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
        getVenueFeatures: () => undefined,
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
        getVenueFeatures: () => undefined,
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
        getVenueFeatures: () => undefined,
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
      getVenueFeatures: () => undefined,
    });

    expect(result).toStrictEqual({
      status: 'unavailable',
      reason: 'unsupported',
    });
  });

  it.each([undefined, {}, { deposit: false }, { deposit: true }] as (
    | PredictVenueFeatures
    | undefined
  )[])(
    'runs the Polymarket deposit on the legacy implementation regardless of features (%j)',
    (features) => {
      const result = resolvePredictFunding('deposit', {
        available: true,
        activeVenue: active('polymarket'),
        getCapabilities: () => descriptor('polymarket', ['deposit']),
        getVenueFeatures: () => features,
      });

      expect(result).toStrictEqual({
        status: 'ready',
        implementation: 'legacy',
      });
    },
  );

  describe('while Kalshi is active', () => {
    const kalshiCatalog = (): PredictVenueCapabilities =>
      descriptor('kalshi', [...KALSHI_STATIC_VENUE_CATALOG.actions]);

    it('runs deposit on the next implementation when venues.kalshi.features.deposit is true', () => {
      const result = resolvePredictFunding('deposit', {
        available: true,
        activeVenue: active('kalshi'),
        getCapabilities: kalshiCatalog,
        getVenueFeatures: (venue) =>
          venue === 'kalshi' ? { deposit: true } : undefined,
      });

      expect(result).toStrictEqual({
        status: 'ready',
        implementation: 'next',
      });
    });

    it.each([undefined, {}, { deposit: false }] as (
      | PredictVenueFeatures
      | undefined
    )[])(
      'offers no deposit when Kalshi features is %j, though the client flow and catalog list it',
      (features) => {
        const result = resolvePredictFunding('deposit', {
          available: true,
          activeVenue: active('kalshi'),
          getCapabilities: kalshiCatalog,
          getVenueFeatures: (venue) =>
            venue === 'kalshi' ? features : { deposit: true },
        });

        expect(PREDICT_FUNDING_IMPLEMENTATIONS.next).toContain('deposit');
        expect(KALSHI_STATIC_VENUE_CATALOG.actions).toContain('deposit');
        expect(result).toStrictEqual({
          status: 'unavailable',
          reason: 'notImplemented',
        });
      },
    );

    it('offers no deposit with features.deposit on while Predict is unavailable', () => {
      const result = resolvePredictFunding('deposit', {
        available: false,
        activeVenue: active('kalshi'),
        getCapabilities: kalshiCatalog,
        getVenueFeatures: () => ({ deposit: true }),
      });

      expect(result).toStrictEqual({
        status: 'unavailable',
        reason: 'unavailable',
      });
    });

    it('offers no deposit with features.deposit on when the descriptor does not list it', () => {
      const result = resolvePredictFunding('deposit', {
        available: true,
        activeVenue: active('kalshi'),
        getCapabilities: () => descriptor('kalshi', ['buy', 'sell']),
        getVenueFeatures: () => ({ deposit: true }),
      });

      expect(result).toStrictEqual({
        status: 'unavailable',
        reason: 'unsupported',
      });
    });

    it('offers no withdraw even when its descriptor lists it, until this client has the flow', () => {
      const result = resolvePredictFunding('withdraw', {
        available: true,
        activeVenue: active('kalshi'),
        getCapabilities: () =>
          descriptor('kalshi', ['buy', 'sell', 'withdraw']),
        getVenueFeatures: () => ({ deposit: true }),
      });

      expect(PREDICT_FUNDING_IMPLEMENTATIONS.next).not.toContain('withdraw');
      expect(result).toStrictEqual({
        status: 'unavailable',
        reason: 'notImplemented',
      });
    });

    it('runs withdraw on the next implementation once both the client flow and the descriptor exist', () => {
      const result = resolvePredictFunding(
        'withdraw',
        {
          available: true,
          activeVenue: active('kalshi'),
          getCapabilities: () =>
            descriptor('kalshi', ['buy', 'sell', 'withdraw']),
          getVenueFeatures: () => undefined,
        },
        { ...PREDICT_FUNDING_IMPLEMENTATIONS, next: ['withdraw'] },
      );

      expect(result).toStrictEqual({
        status: 'ready',
        implementation: 'next',
      });
    });
  });
});
