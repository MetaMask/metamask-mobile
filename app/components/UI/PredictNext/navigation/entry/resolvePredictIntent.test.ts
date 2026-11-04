import Routes from '../../../../../constants/navigation/Routes';
import type { PredictConfig } from '../../config/predictConfig';
import {
  resolveVenueImplementation,
  type PredictConfiguredVenue,
  type PredictImplementationResolution,
} from '../../implementation';
import { resolveActiveVenue } from '../../implementation/resolveActiveVenue';
import type { PredictEntityId, PredictVenueId } from '../../types';
import { PredictNextRoutes } from '../routes';
import {
  createLegacyPredictEventRef,
  createNextPredictEventRef,
  type PredictEventRef,
} from './eventRef';
import type { PredictIntent } from './intents';
import { resolvePredictIntent } from './resolvePredictIntent';

const LEGACY: PredictImplementationResolution = {
  status: 'ready',
  implementation: 'legacy',
};
const KALSHI_VENUE_ID = 'kalshi' as PredictVenueId;
const NEXT_KALSHI: PredictImplementationResolution = {
  status: 'ready',
  implementation: 'next',
  venueId: KALSHI_VENUE_ID,
};
const RESOLVING: PredictImplementationResolution = { status: 'resolving' };

const AB_TESTS = [
  { key: 'homeBalanceBreakdown', variant: 'treatment' },
] as unknown as NonNullable<
  Extract<PredictIntent, { type: 'home' }>['transactionActiveAbTests']
>;

const polymarketRef = createLegacyPredictEventRef({
  marketId: 'market-1',
  providerId: 'polymarket',
});
const kalshiRef = createNextPredictEventRef(
  'kalshi',
  'KXNFLGAME-1' as PredictEntityId,
);

describe('resolvePredictIntent', () => {
  describe('legacy branch: today routes and params', () => {
    it.each<[string, PredictIntent, unknown]>([
      [
        'home without params as { screen } alone',
        { type: 'home' },
        { screen: Routes.PREDICT.MARKET_LIST },
      ],
      [
        'home with its entry point',
        {
          type: 'home',
          entryPoint: 'main_trade_button',
        },
        {
          screen: Routes.PREDICT.MARKET_LIST,
          params: { entryPoint: 'main_trade_button' },
        },
      ],
      [
        'home with A/B attribution',
        {
          type: 'home',
          entryPoint: 'homescreen_balance_breakdown',
          transactionActiveAbTests: AB_TESTS,
        },
        {
          screen: Routes.PREDICT.MARKET_LIST,
          params: {
            entryPoint: 'homescreen_balance_breakdown',
            transactionActiveAbTests: AB_TESTS,
          },
        },
      ],
      [
        'home without empty A/B attribution',
        {
          type: 'home',
          entryPoint: 'homescreen_balance_breakdown',
          transactionActiveAbTests: [],
        },
        {
          screen: Routes.PREDICT.MARKET_LIST,
          params: { entryPoint: 'homescreen_balance_breakdown' },
        },
      ],
      [
        'a feed as the market list tab',
        { type: 'feed', category: 'politics', entryPoint: 'explore' },
        {
          screen: Routes.PREDICT.MARKET_LIST,
          params: { entryPoint: 'explore', tab: 'politics' },
        },
      ],
      [
        'the portfolio without params as { screen } alone',
        { type: 'portfolio' },
        { screen: Routes.PREDICT.POSITIONS },
      ],
      [
        'the portfolio activity tab as the legacy history tab',
        { type: 'portfolio', tab: 'activity', entryPoint: 'rewards' },
        {
          screen: Routes.PREDICT.POSITIONS,
          params: { entryPoint: 'rewards', initialTab: 'history' },
        },
      ],
      [
        'the portfolio positions tab',
        { type: 'portfolio', tab: 'positions' },
        {
          screen: Routes.PREDICT.POSITIONS,
          params: { initialTab: 'positions' },
        },
      ],
    ])('opens %s through the Predict root', (_, intent, params) => {
      expect(resolvePredictIntent(intent, LEGACY)).toStrictEqual({
        status: 'ready',
        target: { kind: 'predict', params },
      });
    });

    it.each(['trending', 'sports', 'crypto', 'politics'] as const)(
      'keeps the %s feed category as the market list tab',
      (category) => {
        expect(
          resolvePredictIntent({ type: 'feed', category }, LEGACY),
        ).toStrictEqual({
          status: 'ready',
          target: {
            kind: 'predict',
            params: {
              screen: Routes.PREDICT.MARKET_LIST,
              params: { tab: category },
            },
          },
        });
      },
    );

    it('opens a Polymarket Event through usePredictNavigation market details', () => {
      expect(
        resolvePredictIntent(
          { type: 'event', eventRef: polymarketRef },
          LEGACY,
        ),
      ).toStrictEqual({
        status: 'ready',
        target: {
          kind: 'legacyMarketDetails',
          params: { marketId: 'market-1', providerId: 'polymarket' },
        },
      });
    });

    it('keeps the entry point and drops the title snapshot on a Polymarket Event', () => {
      expect(
        resolvePredictIntent(
          {
            type: 'event',
            eventRef: polymarketRef,
            entryPoint: 'search',
            titleSnapshot: 'Will it rain?',
          },
          LEGACY,
        ),
      ).toStrictEqual({
        status: 'ready',
        target: {
          kind: 'legacyMarketDetails',
          params: {
            marketId: 'market-1',
            providerId: 'polymarket',
            entryPoint: 'search',
          },
        },
      });
    });

    it.each<[string, PredictIntent, unknown]>([
      [
        'with an immediate deposit',
        { type: 'addFunds', autoDeposit: true },
        {
          screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
          params: { autoDeposit: true },
        },
      ],
      [
        'without params',
        { type: 'addFunds' },
        { screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET },
      ],
    ])('opens add funds %s in the Predict modals', (_, intent, params) => {
      expect(resolvePredictIntent(intent, LEGACY)).toStrictEqual({
        status: 'ready',
        target: { kind: 'predictModals', params },
      });
    });

    it('opens nothing for a Kalshi Event', () => {
      expect(
        resolvePredictIntent({ type: 'event', eventRef: kalshiRef }, LEGACY),
      ).toStrictEqual({ status: 'unavailable', reason: 'venueMismatch' });
    });
  });

  describe('next branch: PredictNext routes with venueId', () => {
    it.each<[string, PredictIntent]>([
      ['home', { type: 'home', entryPoint: 'main_trade_button' }],
      [
        'home with A/B attribution',
        { type: 'home', transactionActiveAbTests: AB_TESTS },
      ],
      ['a feed', { type: 'feed', category: 'sports', entryPoint: 'explore' }],
    ])('opens %s at PredictNext Home', (_, intent) => {
      expect(resolvePredictIntent(intent, NEXT_KALSHI)).toStrictEqual({
        status: 'ready',
        target: {
          kind: 'predict',
          params: { screen: PredictNextRoutes.HOME },
        },
      });
    });

    it('opens a Kalshi Event with its Venue and title snapshot', () => {
      expect(
        resolvePredictIntent(
          {
            type: 'event',
            eventRef: kalshiRef,
            titleSnapshot: 'Bills at Jets',
          },
          NEXT_KALSHI,
        ),
      ).toStrictEqual({
        status: 'ready',
        target: {
          kind: 'predict',
          params: {
            screen: PredictNextRoutes.EVENT,
            params: {
              venueId: KALSHI_VENUE_ID,
              eventId: 'KXNFLGAME-1',
              titleSnapshot: 'Bills at Jets',
            },
          },
        },
      });
    });

    it('opens a Kalshi Event with an empty title snapshot when it has none', () => {
      const resolution = resolvePredictIntent(
        { type: 'event', eventRef: kalshiRef },
        NEXT_KALSHI,
      );

      expect(resolution).toMatchObject({
        target: { params: { params: { titleSnapshot: '' } } },
      });
    });

    it('opens nothing for a Polymarket Event', () => {
      expect(
        resolvePredictIntent(
          { type: 'event', eventRef: polymarketRef },
          NEXT_KALSHI,
        ),
      ).toStrictEqual({ status: 'unavailable', reason: 'venueMismatch' });
    });

    it('opens nothing for an Event of another PredictNext Venue', () => {
      const otherVenueRef = createNextPredictEventRef(
        'otherVenue' as 'kalshi',
        'event-1' as PredictEntityId,
      );

      expect(
        resolvePredictIntent(
          { type: 'event', eventRef: otherVenueRef },
          NEXT_KALSHI,
        ),
      ).toStrictEqual({ status: 'unavailable', reason: 'venueMismatch' });
    });

    it.each<[string, PredictIntent, unknown]>([
      ['without a tab', { type: 'portfolio' }, { venueId: KALSHI_VENUE_ID }],
      [
        'on its activity tab',
        { type: 'portfolio', tab: 'activity', entryPoint: 'rewards' },
        { venueId: KALSHI_VENUE_ID, initialTab: 'activity' },
      ],
    ])('opens the Portfolio %s', (_, intent, params) => {
      expect(resolvePredictIntent(intent, NEXT_KALSHI)).toStrictEqual({
        status: 'ready',
        target: {
          kind: 'predict',
          params: { screen: PredictNextRoutes.PORTFOLIO, params },
        },
      });
    });

    it('opens nothing for add funds, which PredictNext does not implement', () => {
      expect(
        resolvePredictIntent(
          { type: 'addFunds', autoDeposit: true },
          NEXT_KALSHI,
        ),
      ).toStrictEqual({ status: 'unavailable', reason: 'unsupported' });
    });
  });

  describe('while the Active Venue is resolving', () => {
    it.each<PredictIntent>([
      { type: 'home', entryPoint: 'homescreen_pill' },
      { type: 'feed', category: 'crypto', entryPoint: 'explore' },
    ])(
      'opens $type with today legacy navigation for the root router to resolve',
      (intent) => {
        expect(resolvePredictIntent(intent, RESOLVING)).toStrictEqual(
          resolvePredictIntent(intent, LEGACY),
        );
      },
    );

    it.each<PredictIntent>([
      { type: 'event', eventRef: polymarketRef },
      { type: 'event', eventRef: kalshiRef },
      { type: 'portfolio' },
      { type: 'addFunds', autoDeposit: true },
    ])('opens nothing for a Venue-dependent $type intent', (intent) => {
      expect(resolvePredictIntent(intent, RESOLVING)).toStrictEqual({
        status: 'unavailable',
        reason: 'resolving',
      });
    });
  });

  describe('across an Active Venue flip', () => {
    const config = (
      venues: Record<PredictConfiguredVenue, boolean>,
      enabled = true,
    ): PredictConfig => ({
      enabled,
      venues: {
        polymarket: { enabled: venues.polymarket },
        kalshi: { enabled: venues.kalshi },
      },
      venueSelection: { enabled: true },
    });

    /** The implementation the app derives from config and preference. */
    const implementationFor = (
      predictConfig: PredictConfig,
      venueSelectionPreference: PredictConfiguredVenue | null = null,
    ) =>
      resolveVenueImplementation(
        resolveActiveVenue({
          config: predictConfig,
          venueSelectionPreference,
          sessionDefault: { venue: 'polymarket', source: 'fallback' },
        }),
      );

    const BOTH = { polymarket: true, kalshi: true };

    const cases: [
      string,
      PredictImplementationResolution,
      'legacy' | 'next',
    ][] = [
      [
        'the legacy lane (predictConfig disabled)',
        implementationFor(config(BOTH, false)),
        'legacy',
      ],
      [
        'a Polymarket-only rollout',
        implementationFor(config({ polymarket: true, kalshi: false })),
        'legacy',
      ],
      [
        'a Kalshi-only rollout',
        implementationFor(config({ polymarket: false, kalshi: true })),
        'next',
      ],
      [
        'a Kalshi preference',
        implementationFor(config(BOTH), 'kalshi'),
        'next',
      ],
      [
        'a Polymarket preference',
        implementationFor(config(BOTH), 'polymarket'),
        'legacy',
      ],
    ];

    it.each(cases)(
      'sends Home to the %s implementation',
      (_, implementation, expected) => {
        const resolution = resolvePredictIntent(
          { type: 'home' },
          implementation,
        );

        expect(resolution).toStrictEqual({
          status: 'ready',
          target: {
            kind: 'predict',
            params: {
              screen:
                expected === 'legacy'
                  ? Routes.PREDICT.MARKET_LIST
                  : PredictNextRoutes.HOME,
            },
          },
        });
      },
    );

    it.each(cases)(
      'opens only the Event of the Active Venue under %s',
      (_, implementation, expected) => {
        const opens = (eventRef: PredictEventRef) =>
          resolvePredictIntent({ type: 'event', eventRef }, implementation)
            .status === 'ready';

        expect({
          polymarket: opens(polymarketRef),
          kalshi: opens(kalshiRef),
        }).toStrictEqual({
          polymarket: expected === 'legacy',
          kalshi: expected === 'next',
        });
      },
    );

    it.each(cases)(
      'offers add funds only on the legacy implementation under %s',
      (_, implementation, expected) => {
        expect(
          resolvePredictIntent({ type: 'addFunds' }, implementation).status,
        ).toBe(expected === 'legacy' ? 'ready' : 'unavailable');
      },
    );

    it('resolves the same intent to different routes when the preference flips', () => {
      const intent: PredictIntent = { type: 'portfolio', tab: 'activity' };

      const onPolymarket = resolvePredictIntent(
        intent,
        implementationFor(config(BOTH), 'polymarket'),
      );
      const onKalshi = resolvePredictIntent(
        intent,
        implementationFor(config(BOTH), 'kalshi'),
      );

      expect(onPolymarket).toMatchObject({
        target: {
          params: {
            screen: Routes.PREDICT.POSITIONS,
            params: { initialTab: 'history' },
          },
        },
      });
      expect(onKalshi).toMatchObject({
        target: {
          params: {
            screen: PredictNextRoutes.PORTFOLIO,
            params: { venueId: 'kalshi', initialTab: 'activity' },
          },
        },
      });
    });
  });
});
