import '../mocks';
import React from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { Text } from 'react-native';
import { act } from '@testing-library/react-native';
import {
  getRouteParamsProbeTestId,
  getRouteProbeTestId,
  renderComponentViewScreen,
  renderScreenWithRoutes,
} from '../render';
import { initialStatePredictNext } from '../presets/predictNext';
import { initialStatePredict } from '../presets/predict';
import {
  BOTH_VENUES_PREDICT_CONFIG,
  predictVenueState,
} from '../fixtures/predictNext';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Engine from '../../../app/core/Engine';
import { updateBgState } from '../../../app/core/redux/slices/engine';
import { ToastContext } from '../../../app/component-library/components/Toast';
import type { ToastRef } from '../../../app/component-library/components/Toast/Toast.types';
import {
  ControllerEventToastBridge,
  type ToastRegistration,
} from '../../../app/components/Nav/App/ControllerEventToastBridge';
import Routes from '../../../app/constants/navigation/Routes';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppNavigationProp } from '../../../app/core/NavigationService/types';
import { PredictRoot } from '../../../app/components/UI/PredictNext';
import type { PredictConfig } from '../../../app/components/UI/PredictNext/config/predictConfig';
import type { PredictVenueControllerState } from '../../../app/components/UI/PredictNext/implementation/PredictVenueController';
import type { PredictConfiguredVenue } from '../../../app/components/UI/PredictNext/implementation/types';
import { PredictHome } from '../../../app/components/UI/PredictNext/views/PredictHome/PredictHome';
import { PredictEventScreen } from '../../../app/components/UI/PredictNext/views/PredictEvent/PredictEventScreen';
import {
  EventMarketList,
  type EventMarketListProps,
} from '../../../app/components/UI/PredictNext/views/PredictEvent/internal/EventMarketList';
import { PredictFeedScreen } from '../../../app/components/UI/PredictNext/views/PredictFeedScreen/PredictFeedScreen';
import { PredictPortfolioScreen } from '../../../app/components/UI/PredictNext/views/PredictPortfolio/PredictPortfolioScreen';
import { PredictSearchScreen } from '../../../app/components/UI/PredictNext/views/PredictSearch/PredictSearchScreen';
import { PredictDepositScreen } from '../../../app/components/UI/PredictNext/views/PredictDeposit/PredictDepositScreen';
import { PredictNextRoutes } from '../../../app/components/UI/PredictNext/navigation/routes';
import { PredictOrderFlowProvider } from '../../../app/components/UI/PredictNext/views/PredictOrderFlow';
import { PredictWithdrawScreen } from '../../../app/components/UI/PredictNext/views/PredictWithdrawFlow';
import { NextVenueProvider } from '../../../app/components/UI/PredictNext/implementation';
import type { PredictVenueId } from '../../../app/components/UI/PredictNext/types';
import type {
  PredictNextStackParamList,
  PredictNextDepositParams,
  PredictNextEventParams,
  PredictNextFeedParams,
  PredictNextPortfolioParams,
  PredictNextSearchParams,
} from '../../../app/components/UI/PredictNext/navigation/types';

/** The Venue a Kalshi-only rollout resolves, which the fixtures describe. */
const DEFAULT_VENUE_ID = 'kalshi' as PredictVenueId;

/** Mirrors production wiring: `PredictImplementationSwitch` provides the
 * Active Venue above the stack, and the Order flow provider wraps it. The
 * Withdraw flow is a stack screen, not a provider. */
const withOrderFlow =
  (
    Component: React.ComponentType,
    venueId: PredictVenueId = DEFAULT_VENUE_ID,
  ): React.ComponentType =>
  (props) => (
    <PredictOrderFlowProvider>
      <NextVenueProvider venueId={venueId}>
        <Component {...props} />
      </NextVenueProvider>
    </PredictOrderFlowProvider>
  );

const EventScreen = withOrderFlow(
  PredictEventScreen as unknown as React.ComponentType,
);
const FeedScreen = withOrderFlow(
  PredictFeedScreen as unknown as React.ComponentType<object>,
);
/** The implementation switch provides the resolved Active Venue to the
 * stack's entry screen. */
const homeScreenFor = (venueId: PredictVenueId) =>
  withOrderFlow(() => <PredictHome />, venueId);

const HomeScreen = homeScreenFor(DEFAULT_VENUE_ID);
const PortfolioScreen = withOrderFlow(
  PredictPortfolioScreen as unknown as React.ComponentType<object>,
);
const SearchScreen = withOrderFlow(
  PredictSearchScreen as unknown as React.ComponentType<object>,
);
const WithdrawScreen = withOrderFlow(
  PredictWithdrawScreen as unknown as React.ComponentType<object>,
);

/** Shows the params the Predict root route was opened with. */
const PredictRootParamsProbe = () => {
  const route = useRoute();
  return (
    <Text testID={getRouteParamsProbeTestId(Routes.PREDICT.ROOT)}>
      {JSON.stringify(route.params)}
    </Text>
  );
};

/**
 * The Order Flow over a probe screen, with the Predict root route registered
 * as a params probe for the sheet's ways out of the PredictNext stack.
 */
export const renderPredictOrderFlow = (
  Component: React.ComponentType,
  { remoteFeatureFlags }: { remoteFeatureFlags?: Record<string, unknown> } = {},
) =>
  renderScreenWithRoutes(
    withOrderFlow(Component),
    { name: PredictNextRoutes.HOME },
    [{ name: Routes.PREDICT.ROOT, Component: PredictRootParamsProbe }],
    {
      state: (remoteFeatureFlags
        ? initialStatePredictNext().withRemoteFeatureFlags(remoteFeatureFlags)
        : initialStatePredictNext()
      ).build(),
    },
  );

export const renderPredictNext = (
  privacyMode = false,
  {
    venueId = DEFAULT_VENUE_ID,
    remoteFeatureFlags = {},
    queryClient,
  }: {
    venueId?: PredictVenueId;
    remoteFeatureFlags?: Record<string, unknown>;
    /** A caller-owned client, for tests that warm or refetch the cache. */
    queryClient?: QueryClient;
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
      { name: PredictNextRoutes.DEPOSIT },
      { name: PredictNextRoutes.WITHDRAW, Component: WithdrawScreen },
      // A probe: Home never leaves Predict for the app's Explore tab.
      { name: Routes.TRENDING_VIEW },
    ],
    {
      state: initialStatePredictNext(privacyMode)
        .withRemoteFeatureFlags(remoteFeatureFlags)
        .build(),
    },
    undefined,
    queryClient,
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
  remoteFeatureFlags: Record<string, unknown> = {},
) =>
  renderScreenWithRoutes(
    PortfolioScreen,
    { name: PredictNextRoutes.PORTFOLIO },
    [
      { name: PredictNextRoutes.HOME, Component: HomeScreen },
      { name: PredictNextRoutes.EVENT, Component: EventScreen },
      { name: PredictNextRoutes.DEPOSIT },
      { name: PredictNextRoutes.WITHDRAW, Component: WithdrawScreen },
    ],
    {
      state: initialStatePredictNext(privacyMode)
        .withRemoteFeatureFlags(remoteFeatureFlags)
        .build(),
    },
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

/**
 * Stands in for the wallet's bottom-sheet confirmation, which the app root
 * registers: it closes at once, as it does once the user confirms or
 * rejects, and the wallet's answer comes from the mocked
 * `TransactionController.addTransaction`.
 */
const ConfirmationSheetProbe = () => {
  const navigation = useNavigation();
  React.useEffect(() => {
    navigation.goBack();
  }, [navigation]);
  return null;
};

/**
 * The Kalshi deposit screen, opened from a Home probe as Home opens it, so
 * leaving the screen lands back on that probe. Feed its Venue catalog through
 * {@link configurePredictNextCatalog}.
 */
export const renderPredictDepositScreen = (
  params: PredictNextDepositParams,
  {
    queryClient,
  }: {
    queryClient?: QueryClient;
  } = {},
) => {
  const HomeProbe = () => {
    const navigation =
      useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
    React.useEffect(() => {
      navigation.navigate(PredictNextRoutes.DEPOSIT, params);
    }, [navigation]);
    return <Text testID={getRouteProbeTestId(PredictNextRoutes.HOME)} />;
  };
  return renderScreenWithRoutes(
    HomeProbe,
    { name: PredictNextRoutes.HOME },
    [
      { name: PredictNextRoutes.DEPOSIT, Component: PredictDepositScreen },
      {
        name: Routes.CONFIRMATION_REQUEST_MODAL,
        Component: ConfirmationSheetProbe,
      },
    ],
    { state: initialStatePredictNext().build() },
    undefined,
    queryClient,
  );
};

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

export interface RenderPredictToastShellOptions {
  /** Hook returning the `ControllerEventToastBridge` registrations to mount. */
  useRegistrations: () => ToastRegistration[];
  /** Screen or probe element mounted under `ToastContext.Provider`. */
  screen: React.ReactNode;
  venue?: PredictConfiguredVenue;
  name?: string;
}

/**
 * Mounts `ControllerEventToastBridge` alongside a screen inside a mocked
 * `ToastContext.Provider` with both Predict venues enabled, returning helpers
 * to switch Active Venue and inspect emitted toast labels.
 */
export const renderPredictToastShell = ({
  useRegistrations,
  screen: screenContent,
  venue = 'kalshi',
  name = 'PredictNotificationsProbe',
}: RenderPredictToastShellOptions) => {
  const showToast = jest.fn();
  const toastRef = {
    current: { showToast, closeToast: jest.fn() },
  } as unknown as React.RefObject<ToastRef>;

  const PredictToasts = () => {
    const registrations = useRegistrations();
    return <ControllerEventToastBridge registrations={registrations} />;
  };

  const AppShell = () => (
    <ToastContext.Provider value={{ toastRef }}>
      <PredictToasts />
      {screenContent}
    </ToastContext.Provider>
  );

  const engine = Engine as unknown as { state: Record<string, unknown> };
  const originalEngineState = engine.state;
  const view = renderComponentViewScreen(
    AppShell,
    { name },
    {
      state: initialStatePredict()
        .withRemoteFeatureFlags({
          predictConfig: BOTH_VENUES_PREDICT_CONFIG,
        })
        .withOverrides({
          engine: {
            backgroundState: {
              PredictVenueController: predictVenueState(venue),
            },
          },
        })
        .build(),
    },
  );

  const selectVenue = (nextVenue: PredictConfiguredVenue) => {
    act(() => {
      engine.state = {
        ...engine.state,
        PredictVenueController: predictVenueState(nextVenue),
      };
      view.store.dispatch(updateBgState({ key: 'PredictVenueController' }));
    });
  };

  const toastLabels = (): string[][] =>
    showToast.mock.calls.map(
      ([options]: [{ labelOptions: { label: string }[] }]) =>
        options.labelOptions.map((item) => item.label),
    );

  const toastTitles = (): string[] => toastLabels().map((labels) => labels[0]);

  return {
    ...view,
    showToast,
    selectVenue,
    toastLabels,
    toastTitles,
    restoreEngineState: () => {
      engine.state = originalEngineState;
    },
  };
};
