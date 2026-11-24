import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
  renderScreenWithRoutes,
} from '../../../../../../tests/component-view/render';
import { initialStatePredictNext } from '../../../../../../tests/component-view/presets/predictNext';
import {
  configurePredictNextEvent,
  configurePredictNextFeeds,
  makePredictNextEvent,
} from '../../../../../../tests/component-view/fixtures/predictNext';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import type { PredictConfig } from '../../config/predictConfig';
import type { PredictEntityId } from '../../types';
import PredictRoot from '../root/PredictRoot';
import { PredictNextRoutes } from '../routes';
import { PredictEventScreenTestIds } from '../../views/PredictEvent/PredictEventScreen.testIds';
import { PredictHomeTestIds } from '../../views/PredictHome/PredictHome.testIds';
import { PredictPortfolioScreenTestIds } from '../../views/PredictPortfolio/PredictPortfolioScreen.testIds';
import {
  createLegacyPredictEventRef,
  createNextPredictEventRef,
  createPredictCampaignEventRef,
} from './eventRef';
import type { PredictIntent } from './intents';
import { usePredictEntryActions } from './usePredictEntryActions';

const ENTRY_ROUTE = 'PredictEntryProbe';
/** A caller not yet on intents, navigating to a legacy child route. */
const LEGACY_ROUTE_CALLER = 'legacy-route-caller';

const LEGACY_LANE: PredictConfig = {
  enabled: false,
  venues: { polymarket: { enabled: true }, kalshi: { enabled: true } },
  venueSelection: { enabled: false },
};

const KALSHI_ONLY: PredictConfig = {
  enabled: true,
  venues: { polymarket: { enabled: false }, kalshi: { enabled: true } },
  venueSelection: { enabled: false },
};

/** Both Venues rolled out: the Active Venue resolves from the region. */
const BOTH_VENUES: PredictConfig = {
  enabled: true,
  venues: { polymarket: { enabled: true }, kalshi: { enabled: true } },
  venueSelection: { enabled: true },
};

const polymarketRef = createLegacyPredictEventRef({
  marketId: 'market-1',
  providerId: 'polymarket',
});
const KALSHI_EVENT = makePredictNextEvent('KXNFLGAME-1', 'Bills at Jets');
const kalshiRef = createNextPredictEventRef(
  'kalshi',
  KALSHI_EVENT.id as PredictEntityId,
);

const INTENTS = {
  home: { type: 'home', entryPoint: 'main_trade_button' },
  feed: { type: 'feed', category: 'sports', entryPoint: 'explore' },
  polymarketEvent: { type: 'event', eventRef: polymarketRef },
  kalshiEvent: {
    type: 'event',
    eventRef: kalshiRef,
    titleSnapshot: KALSHI_EVENT.title,
  },
  portfolio: { type: 'portfolio', tab: 'activity' },
  addFunds: { type: 'addFunds', autoDeposit: true },
  /** Predict The Pitch runs on Polymarket. */
  campaignHome: {
    type: 'home',
    entryPoint: 'rewards',
    campaign: 'predict-the-pitch',
  },
  campaignEvent: {
    type: 'event',
    eventRef: createPredictCampaignEventRef('predict-the-pitch', 'event-1'),
    entryPoint: 'rewards',
    titleSnapshot: 'Match winner',
    imageSnapshot: 'https://example.com/icon.png',
  },
} satisfies Record<string, PredictIntent>;

type IntentName = keyof typeof INTENTS;

const openTestId = (name: IntentName) => `open-${name}`;
const canOpenTestId = (name: IntentName) => `can-open-${name}`;

/** A screen outside Predict that opens every intent through entry actions. */
const EntryProbe = () => {
  const { openPredict, canOpenPredict } = usePredictEntryActions();
  const navigation = useNavigation<AppNavigationProp>();
  return (
    <>
      <Pressable
        testID={LEGACY_ROUTE_CALLER}
        onPress={() =>
          navigation.navigate(Routes.PREDICT.ROOT, {
            screen: Routes.PREDICT.MARKET_DETAILS,
            params: { marketId: 'market-1', providerId: 'polymarket' },
          })
        }
      />
      {(Object.keys(INTENTS) as IntentName[]).map((name) => (
        <Pressable
          key={name}
          testID={openTestId(name)}
          onPress={() => openPredict(INTENTS[name])}
        >
          <Text testID={canOpenTestId(name)}>
            {String(canOpenPredict(INTENTS[name]))}
          </Text>
        </Pressable>
      ))}
    </>
  );
};

const stateFor = (predictConfig: PredictConfig) =>
  initialStatePredictNext().withRemoteFeatureFlags({ predictConfig }).build();

/** The entry probe with the Predict root and modal routes registered. */
const renderWithRouteProbes = (predictConfig: PredictConfig) =>
  renderScreenWithRoutes(
    EntryProbe,
    { name: ENTRY_ROUTE },
    [
      {
        name: Routes.PREDICT.ROOT,
        Component: createRouteParamsProbe(Routes.PREDICT.ROOT),
      },
      {
        name: Routes.PREDICT.MODALS.ROOT,
        Component: createRouteParamsProbe(Routes.PREDICT.MODALS.ROOT),
      },
    ],
    { state: stateFor(predictConfig) },
  );

type View = ReturnType<typeof renderWithRouteProbes>;

const openAndReadParams = async (
  view: View,
  name: IntentName,
  route: string,
) => {
  fireEvent.press(view.getByTestId(openTestId(name)));
  const params = await view.findByTestId(getRouteParamsProbeTestId(route));
  return JSON.parse(String(params.props.children));
};

const expectNothingOpened = (view: View, name: IntentName) => {
  expect(view.getByTestId(canOpenTestId(name))).toHaveTextContent('false');
  fireEvent.press(view.getByTestId(openTestId(name)));
  expect(
    view.queryByTestId(getRouteParamsProbeTestId(Routes.PREDICT.ROOT)),
  ).not.toBeOnTheScreen();
  expect(
    view.queryByTestId(getRouteParamsProbeTestId(Routes.PREDICT.MODALS.ROOT)),
  ).not.toBeOnTheScreen();
  expect(view.getByTestId(openTestId(name))).toBeOnTheScreen();
};

describe('Predict entry actions', () => {
  describe('on the legacy implementation (legacy lane)', () => {
    it.each<[IntentName, unknown]>([
      [
        'home',
        {
          screen: Routes.PREDICT.MARKET_LIST,
          params: { entryPoint: 'main_trade_button' },
        },
      ],
      [
        'feed',
        {
          screen: Routes.PREDICT.MARKET_LIST,
          params: { entryPoint: 'explore', tab: 'sports' },
        },
      ],
      [
        'polymarketEvent',
        {
          screen: Routes.PREDICT.MARKET_DETAILS,
          params: { marketId: 'market-1', providerId: 'polymarket' },
        },
      ],
      [
        'portfolio',
        {
          screen: Routes.PREDICT.POSITIONS,
          params: { initialTab: 'history' },
        },
      ],
      [
        'campaignHome',
        {
          screen: Routes.PREDICT.MARKET_LIST,
          params: { entryPoint: 'rewards' },
        },
      ],
      [
        'campaignEvent',
        {
          screen: Routes.PREDICT.MARKET_DETAILS,
          params: {
            marketId: 'event-1',
            providerId: 'polymarket',
            entryPoint: 'rewards',
            title: 'Match winner',
            image: 'https://example.com/icon.png',
          },
        },
      ],
    ])('opens %s on its legacy Predict route', async (name, expected) => {
      const view = renderWithRouteProbes(LEGACY_LANE);

      expect(view.getByTestId(canOpenTestId(name))).toHaveTextContent('true');
      expect(
        await openAndReadParams(view, name, Routes.PREDICT.ROOT),
      ).toStrictEqual(expected);
    });

    it('opens add funds on the legacy Predict modal route', async () => {
      const view = renderWithRouteProbes(LEGACY_LANE);

      expect(
        await openAndReadParams(view, 'addFunds', Routes.PREDICT.MODALS.ROOT),
      ).toStrictEqual({
        screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
        params: { autoDeposit: true },
      });
    });

    it('opens nothing for a Kalshi Event', () => {
      expectNothingOpened(renderWithRouteProbes(LEGACY_LANE), 'kalshiEvent');
    });
  });

  describe('on the next implementation (Kalshi rollout)', () => {
    it.each<[IntentName, unknown]>([
      ['home', { screen: PredictNextRoutes.HOME }],
      ['feed', { screen: PredictNextRoutes.HOME }],
      [
        'kalshiEvent',
        {
          screen: PredictNextRoutes.EVENT,
          params: {
            venueId: 'kalshi',
            eventId: KALSHI_EVENT.id,
            titleSnapshot: KALSHI_EVENT.title,
          },
        },
      ],
      [
        'portfolio',
        {
          screen: PredictNextRoutes.PORTFOLIO,
          params: { venueId: 'kalshi', initialTab: 'activity' },
        },
      ],
    ])('opens %s on its PredictNext route', async (name, expected) => {
      const view = renderWithRouteProbes(KALSHI_ONLY);

      expect(view.getByTestId(canOpenTestId(name))).toHaveTextContent('true');
      expect(
        await openAndReadParams(view, name, Routes.PREDICT.ROOT),
      ).toStrictEqual(expected);
    });

    it.each<IntentName>([
      'polymarketEvent',
      'addFunds',
      'campaignHome',
      'campaignEvent',
    ])('opens nothing for %s', (name) => {
      expectNothingOpened(renderWithRouteProbes(KALSHI_ONLY), name);
    });
  });

  describe('through the registered Predict root router (Kalshi rollout)', () => {
    const renderWithPredictRoot = () =>
      renderScreenWithRoutes(
        EntryProbe,
        { name: ENTRY_ROUTE },
        [
          {
            name: Routes.PREDICT.ROOT,
            Component: PredictRoot as React.ComponentType<object>,
          },
        ],
        { state: stateFor(KALSHI_ONLY) },
      );

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('opens PredictNext Home', async () => {
      configurePredictNextFeeds();
      const view = renderWithPredictRoot();

      fireEvent.press(view.getByTestId(openTestId('home')));

      expect(
        await view.findByTestId(PredictHomeTestIds.HOME),
      ).toBeOnTheScreen();
    });

    it('opens the Kalshi Event on the PredictNext Event screen', async () => {
      configurePredictNextEvent(KALSHI_EVENT);
      const view = renderWithPredictRoot();

      fireEvent.press(view.getByTestId(openTestId('kalshiEvent')));

      // The loading screen already shows the title snapshot; its header
      // remounts once the Event loads, so wait for the loaded header first.
      expect(
        await view.findByTestId(PredictEventScreenTestIds.STANDARD_HEADER),
      ).toBeOnTheScreen();
      expect(
        view.getByTestId(PredictEventScreenTestIds.TITLE),
      ).toHaveTextContent(KALSHI_EVENT.title);
      expect(view.queryByTestId(PredictHomeTestIds.HOME)).toBeNull();
    });

    it('serves the Active Venue to a legacy child route, opening PredictNext Home', async () => {
      configurePredictNextFeeds();
      const view = renderWithPredictRoot();

      fireEvent.press(view.getByTestId(LEGACY_ROUTE_CALLER));

      expect(
        await view.findByTestId(PredictHomeTestIds.HOME),
      ).toBeOnTheScreen();
    });

    it('opens the PredictNext Portfolio', async () => {
      configurePredictNextFeeds({ positions: [], activity: [] });
      const view = renderWithPredictRoot();

      fireEvent.press(view.getByTestId(openTestId('portfolio')));

      expect(
        await view.findByTestId(PredictPortfolioScreenTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });
  });

  describe('through the registered Predict root router while the Active Venue resolves', () => {
    const engine = Engine as unknown as { state: Record<string, unknown> };
    const originalEngineState = engine.state;

    const renderResolving = () =>
      renderScreenWithRoutes(
        EntryProbe,
        { name: ENTRY_ROUTE },
        [
          {
            name: Routes.PREDICT.ROOT,
            Component: PredictRoot as React.ComponentType<object>,
          },
        ],
        {
          state: initialStatePredictNext()
            .withRemoteFeatureFlags({ predictConfig: BOTH_VENUES })
            .withOverrides({
              engine: {
                backgroundState: {
                  PredictVenueController: {
                    venueSelectionPreference: null,
                    lastActiveVenue: null,
                    sessionDefault: null,
                  },
                },
              },
            })
            .build(),
        },
      );

    /** Latches the session's regional default, as the Engine publishes it. */
    const latchKalshiSessionDefault = (
      view: ReturnType<typeof renderResolving>,
    ) => {
      act(() => {
        engine.state = {
          ...engine.state,
          PredictVenueController: {
            ...view.store.getState().engine.backgroundState
              .PredictVenueController,
            sessionDefault: { venue: 'kalshi', source: 'geolocation' },
          },
        };
        view.store.dispatch(updateBgState({ key: 'PredictVenueController' }));
      });
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      engine.state = originalEngineState;
    });

    it('lands a feed opened before Kalshi latches on PredictNext Home', async () => {
      configurePredictNextFeeds();
      const view = renderResolving();

      fireEvent.press(view.getByTestId(openTestId('feed')));
      expect(view.queryByTestId(PredictHomeTestIds.HOME)).toBeNull();
      latchKalshiSessionDefault(view);

      expect(
        await view.findByTestId(PredictHomeTestIds.HOME),
      ).toBeOnTheScreen();
    });
  });
});
