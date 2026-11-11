import '../mocks';
import React from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import { initialStatePredictNext } from '../presets/predictNext';
import { initialStatePredict } from '../presets/predict';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Routes from '../../../app/constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../app/core/NavigationService/types';
import { PredictRoot } from '../../../app/components/UI/PredictNext';
import type { PredictConfig } from '../../../app/components/UI/PredictNext/config/predictConfig';
import type { PredictVenueControllerState } from '../../../app/components/UI/PredictNext/implementation/PredictVenueController';
import { PredictHome } from '../../../app/components/UI/PredictNext/views/PredictHome/PredictHome';
import { PredictEventScreen } from '../../../app/components/UI/PredictNext/views/PredictEvent/PredictEventScreen';
import {
  EventMarketList,
  type EventMarketListProps,
} from '../../../app/components/UI/PredictNext/views/PredictEvent/internal/EventMarketList';
import { PredictFeedScreen } from '../../../app/components/UI/PredictNext/views/PredictFeedScreen/PredictFeedScreen';
import { PredictPortfolioScreen } from '../../../app/components/UI/PredictNext/views/PredictPortfolio/PredictPortfolioScreen';
import { PredictSearchScreen } from '../../../app/components/UI/PredictNext/views/PredictSearch/PredictSearchScreen';
import { PredictNextRoutes } from '../../../app/components/UI/PredictNext/navigation/routes';
import { PredictOrderFlowProvider } from '../../../app/components/UI/PredictNext/views/PredictOrderFlow';
import { NextVenueProvider } from '../../../app/components/UI/PredictNext/implementation';
import type { PredictVenueId } from '../../../app/components/UI/PredictNext/types';
import type {
  PredictNextEventParams,
  PredictNextFeedParams,
  PredictNextPortfolioParams,
  PredictNextSearchParams,
} from '../../../app/components/UI/PredictNext/navigation/types';

/** Mirrors production wiring: the Order Flow provider wraps the stack. */
const withOrderFlow =
  (Component: React.ComponentType): React.ComponentType =>
  (props) => (
    <PredictOrderFlowProvider>
      <Component {...props} />
    </PredictOrderFlowProvider>
  );

const EventScreen = withOrderFlow(
  PredictEventScreen as unknown as React.ComponentType,
);
const FeedScreen = withOrderFlow(
  PredictFeedScreen as unknown as React.ComponentType<object>,
);
/** The Venue a Kalshi-only rollout resolves, which the fixtures describe. */
const DEFAULT_VENUE_ID = 'kalshi' as PredictVenueId;

/** Mirrors production wiring: the implementation switch provides the
 * resolved Active Venue to the stack's entry screen. */
const homeScreenFor = (venueId: PredictVenueId) =>
  withOrderFlow(() => (
    <NextVenueProvider venueId={venueId}>
      <PredictHome />
    </NextVenueProvider>
  ));

const HomeScreen = homeScreenFor(DEFAULT_VENUE_ID);
const PortfolioScreen = withOrderFlow(
  PredictPortfolioScreen as unknown as React.ComponentType<object>,
);
const SearchScreen = withOrderFlow(
  PredictSearchScreen as unknown as React.ComponentType<object>,
);

export const renderPredictOrderFlow = (Component: React.ComponentType) =>
  renderComponentViewScreen(
    withOrderFlow(Component),
    { name: PredictNextRoutes.HOME },
    { state: initialStatePredictNext().build() },
  );

export const renderPredictNext = (
  privacyMode = false,
  {
    venueId = DEFAULT_VENUE_ID,
    remoteFeatureFlags = {},
  }: {
    venueId?: PredictVenueId;
    remoteFeatureFlags?: Record<string, unknown>;
  } = {},
) =>
  renderScreenWithRoutes(
    venueId === DEFAULT_VENUE_ID ? HomeScreen : homeScreenFor(venueId),
    { name: PredictNextRoutes.HOME },
    [
      { name: PredictNextRoutes.FEED, Component: FeedScreen },
      { name: PredictNextRoutes.EVENT, Component: EventScreen },
      { name: PredictNextRoutes.PORTFOLIO, Component: PortfolioScreen },
      { name: PredictNextRoutes.SEARCH, Component: SearchScreen },
      // A probe: Home's Trending header leaves Predict for the Explore tab.
      { name: Routes.TRENDING_VIEW },
    ],
    {
      state: initialStatePredictNext(privacyMode)
        .withRemoteFeatureFlags(remoteFeatureFlags)
        .build(),
    },
  );

export const renderPredictSearchScreen = (
  initialParams: PredictNextSearchParams,
) =>
  renderScreenWithRoutes(
    SearchScreen,
    { name: PredictNextRoutes.SEARCH },
    [
      { name: PredictNextRoutes.HOME, Component: HomeScreen },
      { name: PredictNextRoutes.EVENT, Component: EventScreen },
    ],
    { state: initialStatePredictNext().build() },
    { ...initialParams },
  );

export const renderPredictEventScreen = (
  initialParams: PredictNextEventParams,
) =>
  renderScreenWithRoutes(
    EventScreen,
    { name: PredictNextRoutes.EVENT },
    [{ name: PredictNextRoutes.HOME, Component: HomeScreen }],
    { state: initialStatePredictNext().build() },
    { ...initialParams },
  );

/** Exercises the screen-local list without mounting the Event Screen owner. */
export const renderEventMarketList = (
  props: EventMarketListProps,
  {
    privacyMode = false,
    queryClient,
  }: {
    privacyMode?: boolean;
    queryClient?: QueryClient;
  } = {},
) => {
  const handle = React.createRef<{
    updateProps: (next: EventMarketListProps) => void;
  }>();
  const List = () => {
    const [currentProps, setProps] = React.useState(props);
    React.useImperativeHandle(handle, () => ({ updateProps: setProps }), []);
    return <EventMarketList {...currentProps} />;
  };
  const view = renderComponentViewScreen(
    List,
    { name: PredictNextRoutes.EVENT },
    { state: initialStatePredictNext(privacyMode).build() },
    undefined,
    queryClient,
  );

  return {
    ...view,
    updateProps: (next: EventMarketListProps) =>
      handle.current?.updateProps(next),
  };
};

export const renderPredictPortfolioScreen = (
  initialParams: PredictNextPortfolioParams,
  privacyMode = false,
  queryClient?: QueryClient,
) =>
  renderScreenWithRoutes(
    PortfolioScreen,
    { name: PredictNextRoutes.PORTFOLIO },
    [
      { name: PredictNextRoutes.HOME, Component: HomeScreen },
      { name: PredictNextRoutes.EVENT, Component: EventScreen },
    ],
    { state: initialStatePredictNext(privacyMode).build() },
    { ...initialParams },
    queryClient,
  );

export const renderPredictFeedScreen = (initialParams: PredictNextFeedParams) =>
  renderScreenWithRoutes(
    FeedScreen,
    { name: PredictNextRoutes.FEED },
    [
      { name: PredictNextRoutes.HOME, Component: HomeScreen },
      { name: PredictNextRoutes.EVENT, Component: EventScreen },
    ],
    { state: initialStatePredictNext().build() },
    { ...initialParams },
  );

const PREDICT_ENTRY_POINT_ROUTE = 'PredictEntryPointProbe';

export interface RenderPredictRootOptions {
  /** The whole `predictConfig` flag; a partial value parses as the default. */
  predictConfig: PredictConfig;
  venueState?: Partial<PredictVenueControllerState>;
  /** Extra remote flags, such as `predictHomeRedesign`. */
  remoteFeatureFlags?: Record<string, unknown>;
  /**
   * Params an entry point navigates to the `Predict` route with. They are
   * passed by navigating, not as `initialParams`, which the router would
   * merge back into every later navigation to the route.
   */
  entryParams?: Record<string, unknown>;
  /** Replaces the built state, for a remount over a previous render's store. */
  state?: DeepPartial<RootState>;
}

/**
 * Mounts the real root `Predict` route, as `MainNavigator` registers it, so
 * the legacy and PredictNext stacks both mount through the implementation
 * switch. The state carries the legacy Predict baseline as well, because the
 * legacy branch renders the unchanged Polymarket home.
 */
export const renderPredictRoot = ({
  predictConfig,
  venueState = {},
  remoteFeatureFlags = {},
  entryParams,
  state,
}: RenderPredictRootOptions) => {
  const providerValues = {
    state:
      state ??
      initialStatePredict()
        .withRemoteFeatureFlags({ ...remoteFeatureFlags, predictConfig })
        .withOverrides({
          engine: {
            backgroundState: {
              PredictVenueController: {
                venueSelectionPreference: null,
                lastActiveVenue: null,
                sessionDefault: null,
                ...venueState,
              },
            },
          },
        } as DeepPartial<RootState>)
        .build(),
  };
  if (!entryParams) {
    return renderComponentViewScreen(
      PredictRoot,
      { name: Routes.PREDICT.ROOT },
      providerValues,
    );
  }
  const EntryPoint = () => {
    const navigation = useNavigation<AppNavigationProp>();
    React.useEffect(() => {
      navigation.navigate(Routes.PREDICT.ROOT, entryParams as never);
    }, [navigation]);
    return null;
  };
  return renderScreenWithRoutes(
    EntryPoint,
    { name: PREDICT_ENTRY_POINT_ROUTE },
    [{ name: Routes.PREDICT.ROOT, Component: PredictRoot }],
    providerValues,
  );
};
