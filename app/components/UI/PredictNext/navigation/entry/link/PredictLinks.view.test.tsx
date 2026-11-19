import '../../../../../../../tests/component-view/mocks';
import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
  renderScreenWithRoutes,
} from '../../../../../../../tests/component-view/render';
import { initialStatePredictNext } from '../../../../../../../tests/component-view/presets/predictNext';
import {
  configurePredictNextEvent,
  configurePredictNextFeeds,
  makePredictNextEvent,
} from '../../../../../../../tests/component-view/fixtures/predictNext';
import Routes from '../../../../../../constants/navigation/Routes';
import NavigationService from '../../../../../../core/NavigationService';
import ReduxService, { type ReduxStore } from '../../../../../../core/redux';
import { handlePredictUrl } from '../../../../../../core/DeeplinkManager/handlers/intent/handlePredictUrl';
import type { PredictConfig } from '../../../config/predictConfig';
import PredictRoot from '../../root/PredictRoot';
import { PredictEventScreenTestIds } from '../../../views/PredictEvent/PredictEventScreen.testIds';
import { PredictHomeTestIds } from '../../../views/PredictHome/PredictHome.testIds';

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

const KALSHI_EVENT = makePredictNextEvent('KXNFLGAME-1', 'Bills at Jets');
const ENTRY_ROUTE = 'LinkEntry';
const LINK_BUTTON = 'open-link';

/**
 * A screen outside Predict that hands the app navigator to
 * `NavigationService` and opens a link the way the deep-link manager does.
 */
const linkEntry = (predictPath: string, origin?: string) => () => {
  const navigation = useNavigation();
  useEffect(() => {
    NavigationService.navigation =
      navigation as unknown as typeof NavigationService.navigation;
  }, [navigation]);
  return (
    <Pressable
      testID={LINK_BUTTON}
      onPress={() => handlePredictUrl({ predictPath, origin })}
    />
  );
};

let previousStore: ReduxStore | undefined;

const renderLink = (
  predictConfig: PredictConfig,
  predictPath: string,
  { probeRoot = false, origin }: { probeRoot?: boolean; origin?: string } = {},
) => {
  const view = renderScreenWithRoutes(
    linkEntry(predictPath, origin),
    { name: ENTRY_ROUTE },
    [
      {
        name: Routes.PREDICT.ROOT,
        Component: probeRoot
          ? createRouteParamsProbe(Routes.PREDICT.ROOT)
          : (PredictRoot as React.ComponentType<object>),
      },
      {
        name: Routes.PREDICT.MODALS.ROOT,
        Component: createRouteParamsProbe(Routes.PREDICT.MODALS.ROOT),
      },
    ],
    {
      state: initialStatePredictNext()
        .withRemoteFeatureFlags({ predictConfig })
        .build(),
    },
  );
  try {
    previousStore = ReduxService.store;
  } catch {
    previousStore = undefined;
  }
  ReduxService.store = view.store as unknown as ReduxStore;
  return view;
};

type View = ReturnType<typeof renderLink>;

const openLink = (view: View) => fireEvent.press(view.getByTestId(LINK_BUTTON));

/**
 * The handler loads the PredictNext entry point lazily, which compiles cold
 * on a suite's first link, so landings get more than the default second.
 */
const LANDING = { timeout: 5_000 };

const readParams = async (view: View, route: string) =>
  JSON.parse(
    String(
      (
        await view.findByTestId(
          getRouteParamsProbeTestId(route),
          undefined,
          LANDING,
        )
      ).props.children,
    ),
  );

const MARKET_UNAVAILABLE = { screen: Routes.PREDICT.MODALS.MARKET_UNAVAILABLE };

describe('V1 Predict links', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (previousStore) {
      ReduxService.store = previousStore;
    }
  });

  describe('while Polymarket is active (legacy implementation)', () => {
    it('opens a V1 market link on the legacy market details, with its campaign', async () => {
      const view = renderLink(LEGACY_LANE, '?market=23246&utm_source=twitter', {
        probeRoot: true,
      });

      openLink(view);

      expect(await readParams(view, Routes.PREDICT.ROOT)).toStrictEqual({
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '23246',
          providerId: 'polymarket',
          entryPoint: 'deeplink_twitter',
        },
      });
    });

    it('shows Market unavailable for a Kalshi link and opens no Predict screen', async () => {
      const view = renderLink(LEGACY_LANE, '?venue=kalshi&event=KXNFLGAME-1', {
        probeRoot: true,
      });

      openLink(view);

      expect(await readParams(view, Routes.PREDICT.MODALS.ROOT)).toStrictEqual(
        MARKET_UNAVAILABLE,
      );
      expect(
        view.queryByTestId(getRouteParamsProbeTestId(Routes.PREDICT.ROOT)),
      ).toBeNull();
    });
  });

  describe('while Kalshi is active (next implementation)', () => {
    it('opens a Kalshi Event link on the PredictNext Event screen', async () => {
      configurePredictNextEvent(KALSHI_EVENT);
      const view = renderLink(KALSHI_ONLY, '?venue=kalshi&event=KXNFLGAME-1');

      openLink(view);

      expect(
        await view.findByTestId(
          PredictEventScreenTestIds.STANDARD_HEADER,
          undefined,
          LANDING,
        ),
      ).toBeOnTheScreen();
      expect(
        view.getByTestId(PredictEventScreenTestIds.TITLE),
      ).toHaveTextContent(KALSHI_EVENT.title);
    });

    it('opens a bare V1 link on PredictNext Home', async () => {
      configurePredictNextFeeds();
      const view = renderLink(KALSHI_ONLY, '?tab=crypto&utm_source=x');

      openLink(view);

      expect(
        await view.findByTestId(PredictHomeTestIds.HOME, undefined, LANDING),
      ).toBeOnTheScreen();
    });

    it.each(['?market=23246', '?venue=polymarket&market=23246'])(
      'shows Market unavailable for the Polymarket link %s, opening no Kalshi screen',
      async (path) => {
        const view = renderLink(KALSHI_ONLY, path);

        openLink(view);

        expect(
          await readParams(view, Routes.PREDICT.MODALS.ROOT),
        ).toStrictEqual(MARKET_UNAVAILABLE);
        expect(view.queryByTestId(PredictHomeTestIds.HOME)).toBeNull();
        expect(view.queryByTestId(PredictEventScreenTestIds.VIEW)).toBeNull();
      },
    );
  });
});
