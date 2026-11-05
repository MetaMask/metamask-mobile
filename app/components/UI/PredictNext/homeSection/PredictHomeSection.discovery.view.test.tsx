import '../../../../../tests/component-view/mocks';
import React, { createRef, useEffect, useMemo, useState } from 'react';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../__mocks__/@react-native-community/netinfo';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
  renderComponentViewScreen,
  renderScreenWithRoutes,
} from '../../../../../tests/component-view/render';
import { initialStatePredict } from '../../../../../tests/component-view/presets/predict';
import {
  PREDICT_NEXT_FEED_IDS,
  configurePredictNextCatalog,
  configurePredictNextFeeds,
  expectPredictNextGameCard,
  makePredictNextGameEvent,
  makePredictNextPosition,
  messengerCall,
} from '../../../../../tests/component-view/fixtures/predictNext';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import type { UiSlot } from '../../../../core/Engine/controllers/ui-slots-controller/types';
import { updateBgState } from '../../../../core/redux/slices/engine';
import { HomepageScrollContext } from '../../../Views/Homepage/context/HomepageScrollContext';
import type {
  HomeSectionMode,
  SectionRefreshHandle,
} from '../../../Views/Homepage/types';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog; the Polymarket section uses the same id
import { WalletViewSelectorsIDs } from '../../../Views/Wallet/WalletView.testIds';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';
import { KALSHI_STATIC_VENUE_CATALOG } from '../config/venueCatalogs';
import type { PredictConfig } from '../config/predictConfig';
import type { PredictVenueControllerState } from '../implementation/PredictVenueController';
import { NextVenueProvider } from '../implementation';
import { PredictNextRoutes } from '../navigation/routes';
import { PredictOrderFlowProvider } from '../views/PredictOrderFlow';
import { PredictHomeTestIds } from '../views/PredictHome/PredictHome.testIds';
import { PredictOrderFlowTestIds } from '../views/PredictOrderFlow/internal/PredictOrderFlow.testIds';
import { HomeDiscoveryHostContext } from './internal/next/homeDiscoveryHost';
import { NextHomeDiscovery } from './internal/next/NextHomeDiscovery';
import { PredictHomeSectionTestIds } from './PredictHomeSection.testIds';
import { PredictHomeSection } from '.';

const rollout = (venues: {
  polymarket: boolean;
  kalshi: boolean;
}): PredictConfig => ({
  enabled: true,
  venues: {
    polymarket: { enabled: venues.polymarket },
    kalshi: { enabled: venues.kalshi },
  },
  venueSelection: { enabled: venues.polymarket && venues.kalshi },
});

const KALSHI_ONLY = rollout({ polymarket: false, kalshi: true });
const LEGACY_LANE: PredictConfig = {
  enabled: false,
  venues: {
    polymarket: { enabled: false },
    kalshi: { enabled: false },
  },
  venueSelection: { enabled: false },
};

const TITLE = strings('homepage.sections.predictions');
const HEADER_ID = WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('predictions');
const CRYPTO_FEED_ID = 'crypto-btc-5m-live';

const discoveryUiSlot = (
  items: { type: 'event'; id: string; slug: string }[] | 'btc',
): UiSlot =>
  ({
    slotId: 'wallet-home.predict-empty-state',
    contentId: 'predict-empty-state-1',
    revision: 1,
    widget: { type: 'predict-discovery-list', schemaVersion: 1, props: {} },
    dataReferences: [
      {
        id: 'markets',
        type: 'predict-homepage-market-slots',
        params: {
          venue: 'polymarket',
          items:
            items === 'btc'
              ? [{ type: 'series', seriesId: 'btc-up-or-down-5m' }]
              : items,
        },
      },
    ],
  }) as UiSlot;

const stateFor = ({
  predictConfig = KALSHI_ONLY,
  venueSelectionPreference = null,
  uiSlot,
}: {
  predictConfig?: PredictConfig;
  venueSelectionPreference?: PredictVenueControllerState['venueSelectionPreference'];
  uiSlot?: UiSlot;
} = {}) =>
  initialStatePredict()
    .withRemoteFeatureFlags({ predictConfig })
    .withOverrides({
      engine: {
        backgroundState: {
          PredictVenueController: {
            venueSelectionPreference,
            lastActiveVenue: null,
            sessionDefault: null,
          },
          ...(uiSlot
            ? {
                UiSlotsController: {
                  enabled: true,
                  screenConfigurations: {},
                  activeConfigurations: {
                    'wallet-home': {
                      configurationKey: 'wallet-home-key',
                      slotsById: { [uiSlot.slotId]: uiSlot },
                    },
                  },
                },
              }
            : {}),
        },
      },
    })
    .build();

const sectionRef = createRef<SectionRefreshHandle>();
const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

/** The Homepage scroll viewport: the section counts as on screen once it
 * measures inside these bounds. */
const VIEWPORT = {
  subscribeToScroll: () => () => undefined,
  viewportHeight: 800,
  containerScreenY: 0,
  entryPoint: 'home_tab' as const,
  visitId: 1,
  notifySectionViewed: () => undefined,
  getViewedSectionCount: () => 0,
  getVisitMaxDepth: () => -1,
  appSessionId: 'session',
};

const sectionProbe = (mode?: HomeSectionMode) => {
  const Probe = () => (
    <HomepageScrollContext.Provider value={VIEWPORT}>
      <PredictHomeSection
        ref={sectionRef}
        sectionIndex={0}
        totalSectionsLoaded={1}
        mode={mode}
      />
    </HomepageScrollContext.Provider>
  );
  return Probe;
};

const renderSection = (
  options: Parameters<typeof stateFor>[0] = {},
  mode?: HomeSectionMode,
) =>
  renderComponentViewScreen(
    sectionProbe(mode),
    { name: 'PredictHomeSectionProbe' },
    { state: stateFor(options) },
  );

type View = ReturnType<typeof renderSection>;

const renderWithRoutes = () =>
  renderScreenWithRoutes(
    sectionProbe(),
    { name: 'PredictHomeSectionProbe' },
    [
      {
        name: Routes.PREDICT.ROOT,
        Component: createRouteParamsProbe(Routes.PREDICT.ROOT),
      },
    ],
    { state: stateFor() },
  );

const readRootParams = async (view: View) =>
  JSON.parse(
    String(
      (await view.findByTestId(getRouteParamsProbeTestId(Routes.PREDICT.ROOT)))
        .props.children,
    ),
  );

const feedReads = () =>
  messengerCall.mock.calls
    .filter(([action]) => action === 'PredictMarketDataService:getFeed')
    .map(([, venueId, feedId, params]) => ({ venueId, feedId, params }));

const actionCalls = (name: string) =>
  messengerCall.mock.calls.filter(([action]) => action === name);

const getLegacyMarkets = Engine.context.PredictController
  .getMarkets as jest.Mock;
const getLegacyPositions = Engine.context.PredictController
  .getPositions as jest.Mock;

/** Settles the catalog and every Feed read, so absence is asserted after the
 * phase that could have rendered the section. */
const waitForDiscoveryReads = async (feedCount: number) => {
  await waitFor(() => {
    expect(
      actionCalls('PredictMarketDataService:getVenueCatalog').length,
    ).toBeGreaterThan(0);
    expect(feedReads()).toHaveLength(feedCount);
  });
  await act(async () => undefined);
};

/** Serves every other action as configured but never settles Feed reads. */
const holdFeeds = () => {
  const serve = messengerCall.getMockImplementation() as (
    action: string,
    ...params: unknown[]
  ) => unknown;
  messengerCall.mockImplementation((action: string, ...params: unknown[]) =>
    action === 'PredictMarketDataService:getFeed'
      ? new Promise(() => undefined)
      : serve(action, ...params),
  );
};

const engine = Engine as unknown as { state: Record<string, unknown> };
const originalEngineState = engine.state;

/** Publishes new Engine state for one controller to Redux. */
const publish = (view: View, key: string, value: unknown) => {
  act(() => {
    engine.state = { ...engine.state, [key]: value };
    view.store.dispatch(updateBgState({ key }));
  });
};

describe('PredictHomeSection discovery (Kalshi)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configurePredictNextFeeds({ positions: [] });
    getLegacyPositions.mockResolvedValue([]);
  });

  afterEach(() => {
    engine.state = originalEngineState;
    jest.restoreAllMocks();
  });

  describe('content', () => {
    it('shows every supported slot’s games, the header and View more without open Positions', async () => {
      const view = renderSection();

      const discovery = await view.findByTestId(
        PredictHomeSectionTestIds.DISCOVERY,
      );
      await within(discovery).findByTestId(
        PredictHomeTestIds.event('kalshi', 'ncaa-2'),
      );

      expect(within(discovery).getByTestId(HEADER_ID)).toHaveTextContent(TITLE);
      expectPredictNextGameCard(discovery, 'nfl-1', {
        away: 'Packers',
        home: 'Steelers',
        awayScore: '17',
        homeScore: '21',
        awayQuote: 'PAC · 41¢',
        homeQuote: 'STE · 59¢',
        competition: 'NFL',
      });
      expectPredictNextGameCard(discovery, 'nfl-2', {
        away: 'Panthers',
        home: 'Cardinals',
        awayScore: '10',
        homeScore: '7',
        awayQuote: 'PAN · 36¢',
        homeQuote: 'CAR · 64¢',
      });
      expectPredictNextGameCard(discovery, 'ncaa-1', {
        away: 'Pittsburgh',
        home: 'Miami',
        awayScore: '24',
        homeScore: '31',
        awayQuote: 'PIT · 47¢',
        homeQuote: 'MIA · 53¢',
        competition: 'NCAAF',
      });
      expectPredictNextGameCard(discovery, 'ncaa-2', {
        away: 'Georgia',
        home: 'Florida',
        awayScore: '3',
        homeScore: '0',
        awayQuote: 'GEO · 55¢',
        homeQuote: 'FLO · 45¢',
      });
      expect(
        within(discovery).getByTestId(
          PredictHomeSectionTestIds.DISCOVERY_VIEW_MORE,
        ),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeSectionTestIds.POSITIONS),
      ).not.toBeOnTheScreen();
    });

    it('reads only the Venue’s own Feeds, at the PredictNext Home preview size, and never Polymarket markets', async () => {
      const view = renderSection();

      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1'));

      // Each slot's read is its own component; the order they fire in is
      // not part of the contract.
      expect(feedReads()).toHaveLength(2);
      expect(feedReads()).toEqual(
        expect.arrayContaining([
          {
            venueId: KALSHI_VENUE_ID,
            feedId: PREDICT_NEXT_FEED_IDS.nflGames,
            params: { limit: 2 },
          },
          {
            venueId: KALSHI_VENUE_ID,
            feedId: PREDICT_NEXT_FEED_IDS.ncaaGames,
            params: { limit: 2 },
          },
        ]),
      );
      expect(getLegacyMarkets).not.toHaveBeenCalled();
      expect(getLegacyPositions).not.toHaveBeenCalled();
    });

    it('shows discovery instead of the rows when the Positions read fails', async () => {
      configurePredictNextFeeds({ positions: new Error('Positions failed') });

      const view = renderSection();

      expect(
        await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeSectionTestIds.POSITIONS),
      ).not.toBeOnTheScreen();
    });

    it('shows the rows, and reads no Feed, while there are open Positions', async () => {
      configurePredictNextFeeds({ positions: [makePredictNextPosition()] });

      const view = renderSection();

      expect(
        await view.findByTestId(PredictHomeSectionTestIds.POSITIONS),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeSectionTestIds.DISCOVERY),
      ).not.toBeOnTheScreen();
      expect(feedReads()).toEqual([]);
    });

    it('shows discovery, and reads no Positions, in sports mode', async () => {
      configurePredictNextFeeds({ positions: [makePredictNextPosition()] });

      const view = renderSection({}, 'sports');

      expect(
        await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeSectionTestIds.POSITIONS),
      ).not.toBeOnTheScreen();
      expect(actionCalls('PredictPortfolioService:getPositions')).toEqual([]);
    });
  });

  describe('Venue support', () => {
    it('leaves out a slot whose Feed key the Venue lacks, and never reads it', async () => {
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        feeds: { 'nfl-games': PREDICT_NEXT_FEED_IDS.nflGames },
      });

      const view = renderSection();

      expect(
        await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1')),
      ).not.toBeOnTheScreen();
      expect(feedReads().map(({ feedId }) => feedId)).toEqual([
        PREDICT_NEXT_FEED_IDS.nflGames,
      ]);
    });

    it.each([
      [
        'supports no Homepage slot',
        {
          ...KALSHI_STATIC_VENUE_CATALOG,
          feeds: { 'nfl-props': PREDICT_NEXT_FEED_IDS.nflProps },
        },
      ],
      ['serves a malformed catalog', { venueId: 'kalshi', feeds: 'nope' }],
    ])(
      'renders nothing, and reads no Feed, when the Venue %s',
      async (_, catalog) => {
        configurePredictNextCatalog(catalog);

        const view = renderSection();
        await waitForDiscoveryReads(0);

        expect(
          view.queryByTestId(PredictHomeSectionTestIds.DISCOVERY),
        ).not.toBeOnTheScreen();
        expect(view.queryByText(TITLE)).not.toBeOnTheScreen();
        expect(getLegacyMarkets).not.toHaveBeenCalled();
      },
    );
  });

  describe('states', () => {
    it('shows the header over skeleton cards while the Feeds load', async () => {
      holdFeeds();

      const view = renderSection();

      expect(
        await view.findAllByTestId(
          PredictHomeSectionTestIds.DISCOVERY_CARD_SKELETON,
        ),
      ).toHaveLength(2);
      expect(view.getByTestId(HEADER_ID)).toHaveTextContent(TITLE);
      expect(
        view.queryByTestId(PredictHomeSectionTestIds.DISCOVERY_VIEW_MORE),
      ).not.toBeOnTheScreen();
    });

    it('renders nothing when every Feed is empty', async () => {
      configurePredictNextFeeds({ positions: [], nfl: [], ncaa: [] });

      const view = renderSection();
      await waitForDiscoveryReads(2);

      expect(
        view.queryByTestId(PredictHomeSectionTestIds.DISCOVERY),
      ).not.toBeOnTheScreen();
      expect(view.queryByText(TITLE)).not.toBeOnTheScreen();
    });

    it('renders nothing when every Feed fails', async () => {
      configurePredictNextFeeds({
        positions: [],
        nfl: new Error('NFL failed'),
        ncaa: new Error('NCAAF failed'),
      });

      const view = renderSection();
      await waitForDiscoveryReads(2);

      expect(
        view.queryByTestId(PredictHomeSectionTestIds.DISCOVERY),
      ).not.toBeOnTheScreen();
    });

    it('keeps the slots that loaded when one Feed fails', async () => {
      configurePredictNextFeeds({
        positions: [],
        nfl: new Error('NFL failed'),
      });

      const view = renderSection();

      expect(
        await view.findByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1')),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
      ).not.toBeOnTheScreen();
    });

    it('replaces the games on a pull-to-refresh, and keeps the cached ones when the refresh fails', async () => {
      const view = renderSection();
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1'));

      configurePredictNextFeeds({
        positions: [],
        nfl: [makePredictNextGameEvent('nfl-3', 'Bears', 'Lions', 'NFL')],
      });
      await act(async () => {
        await sectionRef.current?.refresh();
      });

      expect(
        await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-3')),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
      ).not.toBeOnTheScreen();

      configurePredictNextFeeds({
        positions: [],
        nfl: new Error('NFL refresh failed'),
        ncaa: new Error('NCAAF refresh failed'),
      });
      const readsBefore = feedReads().length;
      await act(async () => {
        await sectionRef.current?.refresh();
      });

      await waitFor(() =>
        expect(feedReads().length).toBeGreaterThan(readsBefore),
      );
      expect(
        view.getByTestId(PredictHomeTestIds.event('kalshi', 'nfl-3')),
      ).toBeOnTheScreen();
      expect(
        view.getByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1')),
      ).toBeOnTheScreen();
    });
  });

  describe('presses', () => {
    it('opens the Event through a Predict intent when a card is pressed', async () => {
      const view = renderWithRoutes();
      const card = await view.findByTestId(
        PredictHomeTestIds.event('kalshi', 'nfl-1'),
      );

      fireEvent.press(within(card).getByText('Packers'));

      expect(await readRootParams(view)).toEqual({
        screen: PredictNextRoutes.EVENT,
        params: {
          venueId: KALSHI_VENUE_ID,
          eventId: 'nfl-1',
          titleSnapshot: 'Packers vs Steelers',
        },
      });
      expect(
        view.queryByTestId(PredictOrderFlowTestIds.SHEET),
      ).not.toBeOnTheScreen();
    });

    it('opens the Kalshi Order flow over the Homepage when a quote is pressed', async () => {
      const view = renderWithRoutes();
      const card = await view.findByTestId(
        PredictHomeTestIds.event('kalshi', 'nfl-1'),
      );

      fireEvent.press(
        within(card).getByTestId(PredictHomeTestIds.gameQuote('nfl-1', 'away')),
      );

      expect(
        await view.findByTestId(PredictOrderFlowTestIds.SHEET),
      ).toBeOnTheScreen();
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictPortfolioService:getBalance',
        KALSHI_VENUE_ID,
      );
      expect(
        view.queryByTestId(getRouteParamsProbeTestId(Routes.PREDICT.ROOT)),
      ).not.toBeOnTheScreen();
    });

    it('offers no quote buttons when the Venue cannot buy', async () => {
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        actions: ['sell'],
      });

      const view = renderSection();
      const card = await view.findByTestId(
        PredictHomeTestIds.event('kalshi', 'nfl-1'),
      );

      // The prices stay; they are no longer buy buttons.
      expect(within(card).getByText('PAC · 41¢')).toBeOnTheScreen();
      expect(within(card).queryAllByLabelText(/, buy$/)).toHaveLength(0);
    });

    it.each([
      ['the header', HEADER_ID],
      ['View more', PredictHomeSectionTestIds.DISCOVERY_VIEW_MORE],
    ])('opens Predict Home from %s', async (_, testID) => {
      const view = renderWithRoutes();
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1'));

      fireEvent.press(view.getByTestId(testID));

      expect(await readRootParams(view)).toEqual({
        screen: PredictNextRoutes.HOME,
      });
    });
  });

  describe('UI Slots assignment', () => {
    const context = Engine.context as unknown as Record<string, unknown>;

    beforeEach(() => {
      context.UiSlotsController = {
        loadScreen: jest.fn().mockResolvedValue('loaded'),
        refreshScreen: jest.fn().mockResolvedValue('loaded'),
        getNextRefreshAt: jest.fn().mockReturnValue(undefined),
        cancelScreenLoad: jest.fn(),
      };
    });

    // The section unmounts after this file's afterEach hooks, and cancels
    // its UI Slots load then, so the controller stays until the end.
    afterAll(() => {
      delete context.UiSlotsController;
    });

    it('shows the Venue’s own slots, never Polymarket data, when the assignment names only Polymarket Events', async () => {
      const view = renderSection({
        uiSlot: discoveryUiSlot([
          {
            type: 'event',
            id: '202857',
            slug: 'pro-football-2027-champion-20260729185915366',
          },
        ]),
      });

      expect(
        await view.findByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1')),
      ).toBeOnTheScreen();
      expect(
        view.getByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
      ).toBeOnTheScreen();
      expect(getLegacyMarkets).not.toHaveBeenCalled();
    });

    it('shows only the slots the assignment names that the Venue supports', async () => {
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        feeds: {
          ...KALSHI_STATIC_VENUE_CATALOG.feeds,
          'crypto-up-down-live': CRYPTO_FEED_ID,
        },
      });

      const view = renderSection({ uiSlot: discoveryUiSlot('btc') });
      await waitForDiscoveryReads(1);

      // The fixture serves the NCAAF Events for any Feed but NFL Games.
      expect(
        view.getByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1')),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
      ).not.toBeOnTheScreen();
      expect(feedReads().map(({ feedId }) => feedId)).toEqual([CRYPTO_FEED_ID]);
    });
  });

  describe('live data', () => {
    const watchCalls = () =>
      actionCalls('PredictLiveDataService:watchEvents').map(
        ([, venueId, eventIds]) => ({ venueId, eventIds }),
      );
    const unwatchCalls = () =>
      actionCalls('PredictLiveDataService:unwatchEvents').map(
        ([, venueId, eventIds]) => ({ venueId, eventIds }),
      );
    const ALL_CARDS = ['nfl-1', 'nfl-2', 'ncaa-1', 'ncaa-2'];
    const onScreen = { set: (_onScreen: boolean): void => undefined };

    /** Discovery under a host whose on-screen state the test controls, as
     * the section's viewport tracking would set it. */
    const DiscoveryProbe = () => {
      const [isVisible, setIsVisible] = useState(false);
      useEffect(() => {
        onScreen.set = setIsVisible;
      }, []);
      const host = useMemo(
        () => ({ isVisible, onStateChange: () => undefined }),
        [isVisible],
      );
      return (
        <NextVenueProvider venueId={KALSHI_VENUE_ID}>
          <PredictOrderFlowProvider>
            <HomeDiscoveryHostContext.Provider value={host}>
              <NextHomeDiscovery />
            </HomeDiscoveryHostContext.Provider>
          </PredictOrderFlowProvider>
        </NextVenueProvider>
      );
    };

    beforeEach(() => {
      netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    });

    afterEach(() => {
      netInfoMock.__resetMockNetInfo();
    });

    const renderDiscovery = () =>
      renderComponentViewScreen(
        DiscoveryProbe,
        { name: 'PredictHomeDiscoveryProbe' },
        { state: stateFor() },
      );

    it('watches the cards only while the section is on screen', async () => {
      const view = renderDiscovery();
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-2'));

      expect(watchCalls()).toEqual([]);

      act(() => onScreen.set(true));

      await waitFor(() =>
        expect(watchCalls()).toEqual([
          { venueId: KALSHI_VENUE_ID, eventIds: ALL_CARDS },
        ]),
      );

      act(() => onScreen.set(false));

      await waitFor(() =>
        expect(unwatchCalls()).toEqual([
          { venueId: KALSHI_VENUE_ID, eventIds: ALL_CARDS },
        ]),
      );
    });

    it('watches nothing on screen while the device is offline', async () => {
      netInfoMock.__setMockNetInfo({
        type: 'none',
        isInternetReachable: false,
      });
      const view = renderDiscovery();
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-2'));

      act(() => onScreen.set(true));
      await act(async () => undefined);

      expect(
        view.getByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
      ).toBeOnTheScreen();
      expect(watchCalls()).toEqual([]);
    });
  });

  describe('Venue and config changes', () => {
    it('remounts from the Polymarket section to Kalshi discovery on a Venue change', async () => {
      const view = renderSection({
        predictConfig: rollout({ polymarket: true, kalshi: true }),
        venueSelectionPreference: 'polymarket',
      });
      await waitFor(() => expect(getLegacyPositions).toHaveBeenCalled());
      expect(
        view.queryByTestId(PredictHomeSectionTestIds.DISCOVERY),
      ).not.toBeOnTheScreen();

      publish(view, 'PredictVenueController', {
        ...view.store.getState().engine.backgroundState.PredictVenueController,
        venueSelectionPreference: 'kalshi',
      });

      expect(
        await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
      ).toBeOnTheScreen();
    });

    it('drops Kalshi discovery for the Polymarket section when the config flips to the legacy lane', async () => {
      const view = renderSection();
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1'));
      const flags =
        view.store.getState().engine.backgroundState
          .RemoteFeatureFlagController;

      publish(view, 'RemoteFeatureFlagController', {
        ...flags,
        remoteFeatureFlags: {
          ...flags.remoteFeatureFlags,
          predictConfig: LEGACY_LANE,
        },
      });

      await waitFor(() => expect(getLegacyPositions).toHaveBeenCalled());
      expect(
        view.queryByTestId(PredictHomeSectionTestIds.DISCOVERY),
      ).not.toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
      ).not.toBeOnTheScreen();
    });
  });
});
