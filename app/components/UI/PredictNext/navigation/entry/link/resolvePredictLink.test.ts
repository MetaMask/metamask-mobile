import Routes from '../../../../../../constants/navigation/Routes';
import type { RootState } from '../../../../../../reducers';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import type { PredictConfig } from '../../../config/predictConfig';
import type { PredictImplementationResolution } from '../../../implementation';
import type { PredictVenueId } from '../../../types';
import { PredictNextRoutes } from '../../routes';
import { parsePredictLink } from './parsePredictLink';
import {
  PREDICT_LINK_NOT_FOUND,
  resolvePredictLink,
  resolvePredictLinkFromStore,
} from './resolvePredictLink';

const LEGACY: PredictImplementationResolution = {
  status: 'ready',
  implementation: 'legacy',
};
const KALSHI: PredictImplementationResolution = {
  status: 'ready',
  implementation: 'next',
  venueId: 'kalshi' as PredictVenueId,
};
const RESOLVING: PredictImplementationResolution = { status: 'resolving' };

const resolve = (
  predictPath: string,
  implementation: PredictImplementationResolution,
  homeRedesignEnabled = true,
) =>
  resolvePredictLink(parsePredictLink({ predictPath }), implementation, {
    homeRedesignEnabled,
  });

const ready = (routeName: string, params: object) => ({
  status: 'ready',
  navigation: { routeName, params },
});

const notFound = (reason: string) => ({
  status: 'notFound',
  reason,
  navigation: PREDICT_LINK_NOT_FOUND,
});

const predict = (screen: string, params?: object) =>
  ready(Routes.PREDICT.ROOT, params ? { screen, params } : { screen });

describe('resolvePredictLink', () => {
  describe('while Polymarket is active (legacy implementation)', () => {
    it.each<[string, unknown]>([
      [
        '?market=23246&utm_source=twitter',
        predict(Routes.PREDICT.MARKET_DETAILS, {
          marketId: '23246',
          providerId: 'polymarket',
          entryPoint: 'deeplink_twitter',
        }),
      ],
      [
        '?venue=polymarket&event=23246',
        predict(Routes.PREDICT.MARKET_DETAILS, {
          marketId: '23246',
          providerId: 'polymarket',
          entryPoint: 'deeplink',
        }),
      ],
      ['', predict(Routes.PREDICT.MARKET_LIST, { entryPoint: 'deeplink' })],
      [
        '?tab=crypto&q=btc',
        predict(Routes.PREDICT.MARKET_LIST, {
          entryPoint: 'deeplink',
          tab: 'crypto',
          query: 'btc',
        }),
      ],
      [
        '?tab=invalid',
        predict(Routes.PREDICT.MARKET_LIST, { entryPoint: 'deeplink' }),
      ],
      [
        '?feed=sports&tab=all&filter=live&q=nba',
        predict(Routes.PREDICT.FEED, {
          feedId: 'sports',
          initialTabId: 'all',
          initialFilterId: 'live',
          query: 'nba',
          entryPoint: 'deeplink',
        }),
      ],
      [
        '?feed=popular-today&filter=elections',
        predict(Routes.PREDICT.FEED, {
          feedId: 'trending',
          initialFilterId: 'elections',
          entryPoint: 'deeplink',
        }),
      ],
      [
        '?feed=world-cup&utm_source=x',
        predict(Routes.PREDICT.MARKET_LIST, { entryPoint: 'deeplink_x' }),
      ],
    ])('opens %s as before intents', (path, expected) => {
      expect(resolve(path, LEGACY)).toStrictEqual(expected);
    });

    it('keeps a generic feed on the market list while the home redesign is off', () => {
      expect(resolve('?feed=sports&tab=all', LEGACY, false)).toStrictEqual(
        predict(Routes.PREDICT.MARKET_LIST, { entryPoint: 'deeplink' }),
      );
    });

    it.each([
      '?venue=kalshi&event=KXNFLGAME-1',
      '?venue=kalshi&feed=sports-football-nfl',
      '?venue=kalshi',
    ])('gives a bounded not-found for the Kalshi link %s', (path) => {
      expect(resolve(path, LEGACY)).toStrictEqual(notFound('venueMismatch'));
    });
  });

  describe('while Kalshi is active (next implementation)', () => {
    it('opens a Kalshi Event', () => {
      expect(
        resolve('?venue=kalshi&event=KXNFLGAME-1&utm_source=x', KALSHI),
      ).toStrictEqual(
        predict(PredictNextRoutes.EVENT, {
          venueId: 'kalshi',
          eventId: 'KXNFLGAME-1',
          titleSnapshot: '',
        }),
      );
    });

    it('opens a Kalshi Feed Screen on its tab', () => {
      expect(
        resolve('?venue=kalshi&feed=sports-football-nfl&tab=props', KALSHI),
      ).toStrictEqual(
        predict(PredictNextRoutes.FEED, {
          venueId: 'kalshi',
          feedScreenId: 'sports-football-nfl',
          selectedTabId: 'props',
        }),
      );
    });

    it.each(['?venue=kalshi', '', '?tab=crypto', '?feed=sports&q=nba'])(
      'opens PredictNext Home for %s',
      (path) => {
        expect(resolve(path, KALSHI)).toStrictEqual(
          predict(PredictNextRoutes.HOME),
        );
      },
    );

    it.each<[string, string]>([
      // A V1 entity link is Polymarket's, even with a Kalshi-shaped ID.
      ['?market=23246', 'venueMismatch'],
      ['?market=KXNFLGAME-1', 'venueMismatch'],
      ['?venue=polymarket&market=23246', 'venueMismatch'],
      ['?venue=polymarket', 'venueMismatch'],
      ['?venue=kalshi&feed=unknown-screen', 'notFound'],
      ['?venue=kalshi&market=KXNFLGAME-1-BUF', 'notFound'],
      ['?venue=limitless&event=1', 'notFound'],
    ])('gives a bounded not-found for %s (%s)', (path, reason) => {
      expect(resolve(path, KALSHI)).toStrictEqual(notFound(reason));
    });
  });

  describe('while the Active Venue resolves', () => {
    it('takes an unmarked list link to the legacy list, as feeds do', () => {
      expect(resolve('?tab=crypto', RESOLVING)).toStrictEqual(
        predict(Routes.PREDICT.MARKET_LIST, {
          entryPoint: 'deeplink',
          tab: 'crypto',
        }),
      );
    });

    it.each(['?market=1', '?venue=kalshi&event=K-1', '?venue=polymarket'])(
      'gives a bounded not-found for %s',
      (path) => {
        expect(resolve(path, RESOLVING)).toStrictEqual(notFound('resolving'));
      },
    );
  });
});

describe('resolvePredictLinkFromStore', () => {
  const BOTH: PredictConfig = {
    enabled: true,
    venues: { polymarket: { enabled: true }, kalshi: { enabled: true } },
    venueSelection: { enabled: false },
  };

  const stateWith = (
    predictConfig: PredictConfig,
    sessionDefault: { venue: string; source: string } | null,
  ) =>
    ({
      engine: {
        backgroundState: {
          ...backgroundState,
          RemoteFeatureFlagController: {
            ...backgroundState.RemoteFeatureFlagController,
            remoteFeatureFlags: { predictConfig },
          },
          PredictVenueController: {
            venueSelectionPreference: null,
            lastActiveVenue: null,
            sessionDefault,
          },
        },
      },
      settings: { basicFunctionalityEnabled: true },
    }) as unknown as RootState;

  const createStore = (initial: RootState) => {
    let state = initial;
    const listeners = new Set<() => void>();
    return {
      getState: () => state,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      setState: (next: RootState) => {
        state = next;
        listeners.forEach((listener) => listener());
      },
      listenerCount: () => listeners.size,
    };
  };

  const kalshiEvent = parsePredictLink({
    predictPath: '?venue=kalshi&event=KXNFLGAME-1',
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves at once when the Active Venue is known', async () => {
    const store = createStore(
      stateWith(BOTH, { venue: 'kalshi', source: 'geolocation' }),
    );

    await expect(
      resolvePredictLinkFromStore(kalshiEvent, store),
    ).resolves.toHaveProperty('status', 'ready');
  });

  it('waits for the Active Venue to resolve, then opens the link', async () => {
    const store = createStore(stateWith(BOTH, null));

    const pending = resolvePredictLinkFromStore(kalshiEvent, store);
    store.setState(stateWith(BOTH, { venue: 'kalshi', source: 'geolocation' }));

    await expect(pending).resolves.toHaveProperty('status', 'ready');
    expect(store.listenerCount()).toBe(0);
  });

  it('stops waiting after the bound and gives a not-found, never a hang', async () => {
    const store = createStore(stateWith(BOTH, null));

    const pending = resolvePredictLinkFromStore(kalshiEvent, store, 1_000);
    jest.advanceTimersByTime(1_000);

    await expect(pending).resolves.toStrictEqual(notFound('resolving'));
    expect(store.listenerCount()).toBe(0);
  });

  it('gives a not-found for a Kalshi link once Polymarket resolves', async () => {
    const store = createStore(stateWith(BOTH, null));

    const pending = resolvePredictLinkFromStore(kalshiEvent, store);
    store.setState(
      stateWith(BOTH, { venue: 'polymarket', source: 'geolocation' }),
    );

    await expect(pending).resolves.toStrictEqual(notFound('venueMismatch'));
  });
});
