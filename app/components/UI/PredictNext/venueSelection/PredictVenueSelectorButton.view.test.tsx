import '../../../../../tests/component-view/mocks';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import {
  configurePredictNextFeeds,
  messengerCall,
} from '../../../../../tests/component-view/fixtures/predictNext';
import {
  renderPredictRoot,
  type RenderPredictRootOptions,
} from '../../../../../tests/component-view/renderers/predictNext';
import Engine from '../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { updateBgState } from '../../../../core/redux/slices/engine';
import { analytics } from '../../../../util/analytics/analytics';
import Routes from '../../../../constants/navigation/Routes';
import {
  PredictHomeSelectorsIDs,
  PredictMarketListSelectorsIDs,
  PredictSearchSelectorsIDs,
} from '../../Predict/Predict.testIds';
import type { PredictConfig } from '../config/predictConfig';
import type { PredictConfiguredVenue } from '../implementation';
import { PredictHomeTestIds } from '../views/PredictHome/PredictHome.testIds';
import { PredictVenueSelectorTestIds } from './PredictVenueSelector.testIds';

const BOTH_VENUES: PredictConfig = {
  enabled: true,
  venues: {
    polymarket: { enabled: true },
    kalshi: { enabled: true },
  },
  venueSelection: { enabled: true },
};

/** A non-US session: Polymarket (the legacy home) is the regional default. */
const POLYMARKET_SESSION = {
  sessionDefault: { venue: 'polymarket', source: 'geolocation' },
} as const;

type RootView = ReturnType<typeof renderPredictRoot>;

const engine = Engine as unknown as { state: Record<string, unknown> };
const originalEngineState = engine.state;

/**
 * Answers the B1 messenger action as `PredictVenueController` does: stores
 * the preference and publishes the controller state to Redux.
 */
const handleVenueSelectionPreference = (
  getView: () => RootView | undefined,
) => {
  const feeds = messengerCall.getMockImplementation();
  messengerCall.mockImplementation((action: string, ...params: unknown[]) => {
    const view = getView();
    if (
      action !== 'PredictVenueController:setVenueSelectionPreference' ||
      !view
    ) {
      return feeds?.(action, ...params);
    }
    engine.state = {
      ...engine.state,
      PredictVenueController: {
        ...view.store.getState().engine.backgroundState.PredictVenueController,
        venueSelectionPreference: params[0] as PredictConfiguredVenue | null,
      },
    };
    view.store.dispatch(updateBgState({ key: 'PredictVenueController' }));
    return undefined;
  });
};

const renderRoot = (options: Partial<RenderPredictRootOptions> = {}) => {
  // The handler needs the store, which exists only once the render returns.
  const rendered: { view?: RootView } = {};
  handleVenueSelectionPreference(() => rendered.view);
  rendered.view = renderPredictRoot({
    predictConfig: BOTH_VENUES,
    venueState: POLYMARKET_SESSION,
    ...options,
  });
  return rendered.view;
};

const findLegacyHome = (view: RootView) =>
  view.findByTestId(PredictMarketListSelectorsIDs.CONTAINER);

const findNextHome = (view: RootView) =>
  view.findByTestId(PredictHomeTestIds.HOME);

const openPicker = async (view: RootView) => {
  fireEvent.press(await view.findByTestId(PredictVenueSelectorTestIds.BUTTON));
  return view.findByTestId(PredictVenueSelectorTestIds.SHEET);
};

const isMarked = (view: RootView, venue: PredictConfiguredVenue) =>
  view.getByTestId(PredictVenueSelectorTestIds.option(venue)).props
    .accessibilityState?.selected;

const chooseVenue = async (view: RootView, venue: PredictConfiguredVenue) => {
  await openPicker(view);
  await act(async () => {
    fireEvent.press(
      view.getByTestId(PredictVenueSelectorTestIds.option(venue)),
    );
  });
};

const storedPreference = (view: RootView) =>
  view.store.getState().engine.backgroundState.PredictVenueController
    .venueSelectionPreference;

describe('PredictVenueSelectorButton', () => {
  beforeEach(() => {
    configurePredictNextFeeds();
  });

  afterEach(() => {
    engine.state = originalEngineState;
    jest.restoreAllMocks();
  });

  it('switches the root route from the legacy home to the PredictNext home and back', async () => {
    const trackEvent = jest.spyOn(analytics, 'trackEvent');
    const view = renderRoot();
    await findLegacyHome(view);

    await openPicker(view);
    expect(
      view.getByTestId(PredictVenueSelectorTestIds.option('polymarket')),
    ).toHaveTextContent('Polymarket');
    expect(
      view.getByTestId(PredictVenueSelectorTestIds.option('kalshi')),
    ).toHaveTextContent('Kalshi');
    expect(isMarked(view, 'polymarket')).toBe(true);
    expect(isMarked(view, 'kalshi')).toBe(false);

    await act(async () => {
      fireEvent.press(
        view.getByTestId(PredictVenueSelectorTestIds.option('kalshi')),
      );
    });

    expect(await findNextHome(view)).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictMarketListSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(storedPreference(view)).toBe('kalshi');
    expect(trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.SETTINGS_UPDATED.category,
        properties: expect.objectContaining({
          settings_group: 'predict',
          settings_type: 'venue_selection',
          old_value: 'polymarket',
          new_value: 'kalshi',
        }),
      }),
    );

    await openPicker(view);
    expect(isMarked(view, 'kalshi')).toBe(true);
    await act(async () => {
      fireEvent.press(
        view.getByTestId(PredictVenueSelectorTestIds.option('polymarket')),
      );
    });

    expect(await findLegacyHome(view)).toBeOnTheScreen();
    expect(view.queryByTestId(PredictHomeTestIds.HOME)).not.toBeOnTheScreen();
    expect(storedPreference(view)).toBe('polymarket');
  });

  it('places the picker next to search on the redesigned legacy home', async () => {
    const view = renderRoot({
      remoteFeatureFlags: {
        predictHomeRedesign: {
          enabled: true,
          featureVersion: '1.0.0',
          minimumVersion: '0.0.1',
        },
      },
    });

    expect(
      await view.findByTestId(PredictHomeSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON),
    ).toBeOnTheScreen();
    await chooseVenue(view, 'kalshi');

    expect(await findNextHome(view)).toBeOnTheScreen();
  });

  it('lands on the chosen home from an entry that pins the legacy home', async () => {
    const view = renderRoot({
      venueState: {
        sessionDefault: { venue: 'kalshi', source: 'geolocation' },
      },
      entryParams: {
        screen: Routes.PREDICT.MARKET_LIST,
        params: { tab: 'sports' },
      },
    });
    await findLegacyHome(view);

    await openPicker(view);
    expect(isMarked(view, 'kalshi')).toBe(true);
    await act(async () => {
      fireEvent.press(
        view.getByTestId(PredictVenueSelectorTestIds.option('kalshi')),
      );
    });

    expect(await findNextHome(view)).toBeOnTheScreen();
  });

  it('keeps the chosen venue across a remount', async () => {
    const first = renderRoot();
    await chooseVenue(first, 'kalshi');
    await findNextHome(first);
    const persistedState = first.store.getState();
    first.unmount();

    const second = renderRoot({ state: persistedState });

    expect(await findNextHome(second)).toBeOnTheScreen();
    await openPicker(second);
    expect(isMarked(second, 'kalshi')).toBe(true);
  });

  it('is absent from both homes while venue selection is off', async () => {
    const gateOff = { ...BOTH_VENUES, venueSelection: { enabled: false } };
    const legacy = renderRoot({ predictConfig: gateOff });
    await findLegacyHome(legacy);
    expect(
      legacy.getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON),
    ).toBeOnTheScreen();
    expect(
      legacy.queryByTestId(PredictVenueSelectorTestIds.BUTTON),
    ).not.toBeOnTheScreen();
    legacy.unmount();

    const next = renderRoot({
      predictConfig: gateOff,
      venueState: {
        sessionDefault: { venue: 'kalshi', source: 'geolocation' },
      },
    });
    expect(
      await next.findByTestId(PredictHomeTestIds.SEARCH),
    ).toBeOnTheScreen();
    expect(
      next.queryByTestId(PredictVenueSelectorTestIds.BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('ignores a stored preference while venue selection is off, without deleting it', async () => {
    const view = renderRoot({
      predictConfig: { ...BOTH_VENUES, venueSelection: { enabled: false } },
      venueState: { ...POLYMARKET_SESSION, venueSelectionPreference: 'kalshi' },
    });

    expect(await findLegacyHome(view)).toBeOnTheScreen();
    expect(storedPreference(view)).toBe('kalshi');
  });

  it('is absent when only one venue is selectable', async () => {
    const view = renderRoot({
      predictConfig: {
        ...BOTH_VENUES,
        venues: {
          polymarket: { enabled: false },
          kalshi: { enabled: true },
        },
      },
    });

    expect(
      await view.findByTestId(PredictHomeTestIds.SEARCH),
    ).toBeOnTheScreen();
    await waitFor(() =>
      expect(
        view.queryByTestId(PredictVenueSelectorTestIds.BUTTON),
      ).not.toBeOnTheScreen(),
    );
  });
});
