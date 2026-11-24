import type { PredictVenueCapabilities } from '../capabilities/types';
import type {
  ActiveVenueResolution,
  PredictConfiguredVenue,
} from '../implementation/types';
import type { PredictVenueAction, PredictVenueId } from '../types';
import { KALSHI_STATIC_VENUE_CATALOG } from '../contracts/v1/fixtures/kalshiVenueCatalog';
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
    environment: 'production',
    actions,
    feeds: {},
    categories: [],
    searchSupported: false,
    screens: [],
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
    it('runs deposit on the next implementation when the Kalshi catalog descriptor includes deposit', () => {
      const result = resolvePredictFunding('deposit', {
        available: true,
        activeVenue: active('kalshi'),
        getCapabilities: () =>
          descriptor('kalshi', [...KALSHI_STATIC_VENUE_CATALOG.actions]),
      });

      expect(PREDICT_FUNDING_IMPLEMENTATIONS.next).toContain('deposit');
      expect(KALSHI_STATIC_VENUE_CATALOG.actions).toContain('deposit');
      expect(result).toStrictEqual({
        status: 'ready',
        implementation: 'next',
      });
    });

    it('offers no deposit while Predict is unavailable even when the descriptor includes it', () => {
      const result = resolvePredictFunding('deposit', {
        available: false,
        activeVenue: active('kalshi'),
        getCapabilities: () => descriptor('kalshi', ['buy', 'sell', 'deposit']),
      });

      expect(result).toStrictEqual({
        status: 'unavailable',
        reason: 'unavailable',
      });
    });

    it('offers no deposit when the descriptor does not list it', () => {
      const result = resolvePredictFunding('deposit', {
        available: true,
        activeVenue: active('kalshi'),
        getCapabilities: () => descriptor('kalshi', ['buy', 'sell']),
      });

      expect(result).toStrictEqual({
        status: 'unavailable',
        reason: 'unsupported',
      });
    });

    it('offers no deposit while the descriptor is still loading', () => {
      const result = resolvePredictFunding('deposit', {
        available: true,
        activeVenue: active('kalshi'),
        getCapabilities: () => ({ status: 'loading' }),
      });

      expect(result).toStrictEqual({
        status: 'unavailable',
        reason: 'unsupported',
      });
    });

    it('offers no deposit when a ready descriptor omits environment even if actions list deposit', () => {
      const legacy = descriptor('kalshi', ['buy', 'sell', 'deposit']);
      if (legacy.status === 'ready') {
        delete legacy.descriptor.environment;
      }

      expect(
        resolvePredictFunding('deposit', {
          available: true,
          activeVenue: active('kalshi'),
          getCapabilities: () => legacy,
        }),
      ).toStrictEqual({
        status: 'unavailable',
        reason: 'unsupported',
      });
    });

    it('runs Withdraw on the next implementation when the descriptor lists it', () => {
      const result = resolvePredictFunding('withdraw', {
        available: true,
        activeVenue: active('kalshi'),
        getCapabilities: () =>
          descriptor('kalshi', ['buy', 'sell', 'withdraw']),
      });

      expect(result).toStrictEqual({
        status: 'ready',
        implementation: 'next',
      });
    });

    it('runs withdraw on the next implementation once the client flow and the descriptor exist', () => {
      const result = resolvePredictFunding(
        'withdraw',
        {
          available: true,
          activeVenue: active('kalshi'),
          getCapabilities: () =>
            descriptor('kalshi', ['buy', 'sell', 'withdraw']),
        },
        { ...PREDICT_FUNDING_IMPLEMENTATIONS, next: ['withdraw'] },
      );

      expect(result).toStrictEqual({
        status: 'ready',
        implementation: 'next',
      });
    });

    it('offers no Withdraw from a descriptor that omits it', () => {
      const result = resolvePredictFunding('withdraw', {
        available: true,
        activeVenue: active('kalshi'),
        getCapabilities: () => descriptor('kalshi', ['buy', 'sell']),
      });

      expect(result).toStrictEqual({
        status: 'unavailable',
        reason: 'unsupported',
      });
    });

    it.each(FUNDING_ACTIONS)(
      'offers no %s while the Active Venue is resolving',
      (action) => {
        expect(
          resolvePredictFunding(action, {
            available: true,
            activeVenue: { status: 'resolving' },
            getCapabilities: () =>
              descriptor('kalshi', ['buy', 'sell', action]),
          }),
        ).toStrictEqual({ status: 'unavailable', reason: 'resolving' });
      },
    );

    it.each(FUNDING_ACTIONS)(
      'offers no %s while Predict is unavailable for Kalshi',
      (action) => {
        expect(
          resolvePredictFunding(action, {
            available: false,
            activeVenue: active('kalshi'),
            getCapabilities: () =>
              descriptor('kalshi', ['buy', 'sell', action]),
          }),
        ).toStrictEqual({ status: 'unavailable', reason: 'unavailable' });
      },
    );

    it('offers no Withdraw while the descriptor is still loading', () => {
      expect(
        resolvePredictFunding('withdraw', {
          available: true,
          activeVenue: active('kalshi'),
          getCapabilities: () => ({ status: 'loading' }),
        }),
      ).toStrictEqual({ status: 'unavailable', reason: 'unsupported' });
    });
  });
});
