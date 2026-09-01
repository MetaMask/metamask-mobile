import '../mocks';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import renderWithProvider, {
  type DeepPartial,
} from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Routes from '../../../app/constants/navigation/Routes';
import ActivityScreen from '../../../app/components/Views/ActivityScreen/ActivityScreen';
import ActivityList from '../../../app/components/Views/ActivityList';
import ActivityDetails from '../../../app/components/Views/ActivityDetails';
import ActivityTypeFilterSheet from '../../../app/components/Views/ActivityScreen/components/ActivityTypeFilterSheet';
import PerpsActivityFilterSheet from '../../../app/components/Views/ActivityScreen/components/PerpsActivityFilterSheet';
import ActivityNetworkFilterSheet from '../../../app/components/Views/ActivityScreen/components/ActivityNetworkFilterSheet';
import { HardwareWalletProvider } from '../../../app/core/HardwareWallet/HardwareWalletProvider';
import {
  createRouteParamsProbe,
  getRouteProbeTestId,
  renderComponentViewScreen,
  renderScreenWithRoutes,
} from '../render';
import { initialStateActivityWithRedesignEnabled } from '../presets/activity';
import type { ActivityDetailsParams } from '../../../app/components/Views/ActivityDetails/ActivityDetails.types';
import type { ActivityListItem } from '../../../app/util/activity-adapters';
import { stashPreloadedActivityItem } from '../../../app/components/Views/ActivityList/preloadedActivityItemStore';
import { getActivityDetailsRoute } from '../../../app/components/Views/ActivityList/getActivityDetailsRoute';
import { QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import { createUIQueryClient } from '@metamask/react-data-query';
import type { Json } from '@metamask/utils';
import type { DataServiceGranularCacheUpdatedPayload } from '@metamask/base-data-service';
import Engine from '../../../app/core/Engine';
import { DATA_SERVICES } from '../../../app/constants/data-services';
import { Text } from 'react-native';

notifyManager.setBatchNotifyFunction((callback) => callback());

type JsonSubscriptionCallback = (
  data: DataServiceGranularCacheUpdatedPayload,
) => void;

const dataServiceMessenger = {
  call: async (method: string, ...params: Json[]) =>
    (
      Engine.controllerMessenger.call as unknown as (
        method: string,
        ...params: Json[]
      ) => Promise<void | Json>
    )(method, ...params),
  subscribe: (event: string, callback: JsonSubscriptionCallback) => {
    (
      Engine.controllerMessenger.subscribe as unknown as (
        event: string,
        callback: JsonSubscriptionCallback,
      ) => void
    )(event, callback);
  },
  unsubscribe: (event: string, callback: JsonSubscriptionCallback) => {
    (
      Engine.controllerMessenger.unsubscribe as unknown as (
        event: string,
        callback: JsonSubscriptionCallback,
      ) => void
    )(event, callback);
  },
};

function createQueryClient() {
  return createUIQueryClient(DATA_SERVICES, dataServiceMessenger, {
    defaultOptions: { queries: { retry: false } },
  });
}

interface RenderActivityScreenViewOptions {
  overrides?: DeepPartial<RootState>;
  state?: DeepPartial<RootState>;
  params?: Record<string, unknown>;
}

interface RenderActivityScreenViewWithRoutesOptions
  extends RenderActivityScreenViewOptions {
  extraRoutes: { name: string; Component?: React.ComponentType<object> }[];
}

interface RenderActivityListViewOptions {
  overrides?: DeepPartial<RootState>;
  state?: DeepPartial<RootState>;
}

interface RenderActivityListViewWithRoutesOptions
  extends RenderActivityListViewOptions {
  extraRoutes: { name: string; Component?: React.ComponentType<object> }[];
}

interface RenderActivityDetailsViewOptions {
  overrides?: DeepPartial<RootState>;
  state?: DeepPartial<RootState>;
  params: ActivityDetailsParams;
  extraRoutes?: { name: string; Component?: React.ComponentType<object> }[];
}

function ActivityScreenWithProviders() {
  return React.createElement(
    HardwareWalletProvider,
    null,
    React.createElement(ActivityScreen),
  );
}

function ActivityListWithProviders() {
  return React.createElement(
    HardwareWalletProvider,
    null,
    React.createElement(ActivityList),
  );
}

function ActivityDetailsWithProviders() {
  return React.createElement(
    HardwareWalletProvider,
    null,
    React.createElement(ActivityDetails),
  );
}

/** ActivityDetails wrapped for CV route registration (HardwareWalletProvider). */
export { ActivityDetailsWithProviders };

function buildActivityState(options: {
  overrides?: DeepPartial<RootState>;
  state?: DeepPartial<RootState>;
}) {
  if (options.state) {
    return options.state;
  }

  const builder = initialStateActivityWithRedesignEnabled();
  if (options.overrides) {
    builder.withOverrides(options.overrides);
  }

  return builder.build();
}

/**
 * Hosts Activity filter sheets on RootModalFlow (matches production) so chip
 * presses open above the screen / tab bar. Kept as createElement to stay .ts
 * like main.
 */
function renderActivityScreenWithFilterModals(
  options: RenderActivityScreenViewOptions & {
    extraRoutes?: { name: string; Component?: React.ComponentType<object> }[];
  },
): ReturnType<typeof renderWithProvider> {
  const state = buildActivityState(options);
  const RootStack = createNativeStackNavigator();
  const ModalStack = createNativeStackNavigator();

  // Cast Navigators so createElement children args type-check without JSX (.ts).
  interface NavigatorProps {
    screenOptions?: { headerShown: boolean };
  }
  const ModalNavigator =
    ModalStack.Navigator as unknown as React.FC<NavigatorProps>;
  const RootNavigator =
    RootStack.Navigator as unknown as React.FC<NavigatorProps>;

  const RootModalFlow = () =>
    React.createElement(
      ModalNavigator,
      { screenOptions: { headerShown: false } },
      React.createElement(ModalStack.Screen, {
        name: Routes.SHEET.ACTIVITY_TYPE_FILTER,
        component: ActivityTypeFilterSheet,
      }),
      React.createElement(ModalStack.Screen, {
        name: Routes.SHEET.ACTIVITY_PERPS_FILTER,
        component: PerpsActivityFilterSheet,
      }),
      React.createElement(ModalStack.Screen, {
        name: Routes.SHEET.ACTIVITY_NETWORK_FILTER,
        component: ActivityNetworkFilterSheet,
      }),
    );

  const DefaultRouteProbe =
    (routeName: string): React.FC =>
    () =>
      React.createElement(
        Text,
        { testID: getRouteProbeTestId(routeName) },
        routeName,
      );

  const stackTree = React.createElement(
    QueryClientProvider,
    { client: createQueryClient() },
    React.createElement(
      RootNavigator,
      { screenOptions: { headerShown: false } },
      React.createElement(RootStack.Screen, {
        name: Routes.TRANSACTIONS_VIEW,
        component: ActivityScreenWithProviders,
        initialParams: options.params,
      }),
      React.createElement(RootStack.Screen, {
        name: Routes.MODAL.ROOT_MODAL_FLOW,
        component: RootModalFlow,
      }),
      ...(options.extraRoutes ?? []).map(({ name, Component: Extra }) =>
        React.createElement(RootStack.Screen, {
          key: name,
          name,
          component: Extra ?? DefaultRouteProbe(name),
        }),
      ),
    ),
  );

  return renderWithProvider(stackTree, { state });
}

export function renderActivityScreenView(
  options: RenderActivityScreenViewOptions = {},
): ReturnType<typeof renderWithProvider> {
  return renderActivityScreenWithFilterModals(options);
}

export function renderActivityScreenViewWithRoutes(
  options: RenderActivityScreenViewWithRoutesOptions,
): ReturnType<typeof renderWithProvider> {
  return renderActivityScreenWithFilterModals(options);
}

export function renderActivityListView(
  options: RenderActivityListViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const state = buildActivityState(options);

  return renderComponentViewScreen(
    ActivityListWithProviders,
    { name: Routes.TRANSACTIONS_VIEW },
    { state },
  );
}

export function renderActivityListViewWithRoutes(
  options: RenderActivityListViewWithRoutesOptions,
): ReturnType<typeof renderScreenWithRoutes> {
  const state = buildActivityState(options);

  return renderScreenWithRoutes(
    ActivityListWithProviders,
    { name: Routes.TRANSACTIONS_VIEW },
    options.extraRoutes,
    { state },
  );
}

export function renderActivityDetailsView(
  options: RenderActivityDetailsViewOptions,
): ReturnType<typeof renderScreenWithRoutes> {
  const state = buildActivityState({
    overrides: options.overrides,
    state: options.state,
  });

  return renderScreenWithRoutes(
    ActivityDetailsWithProviders,
    { name: Routes.ACTIVITY_DETAILS },
    [
      {
        name: Routes.BRIDGE.MODALS.ROOT,
        Component: createRouteParamsProbe(Routes.BRIDGE.MODALS.ROOT),
      },
      { name: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER },
      { name: Routes.PERPS.ROOT },
      { name: Routes.WEBVIEW.MAIN },
      ...(options.extraRoutes ?? []),
    ],
    { state },
    options.params as unknown as Record<string, unknown>,
  );
}

/**
 * Stashes a provider-backed Activity row (Perps / Predict) and opens Details
 * with the serializable `{ chainId, txIdentifier, preloadKey }` params used in
 * production.
 */
export function renderPreloadedActivityDetailsView(
  item: ActivityListItem,
  options: Omit<RenderActivityDetailsViewOptions, 'params'> = {},
): ReturnType<typeof renderScreenWithRoutes> {
  const preloadKey = stashPreloadedActivityItem(item);

  return renderActivityDetailsView({
    ...options,
    params: {
      chainId: item.chainId,
      txIdentifier: item.hash,
      preloadKey,
    },
  });
}

/**
 * Builds Activity Details route params (including preload stash) the same way
 * ActivityList navigates. Use for provider-backed rows that are not in Redux.
 */
export function getActivityDetailsViewParams(
  item: ActivityListItem,
): ActivityDetailsParams {
  const params = getActivityDetailsRoute(item);
  if (!params) {
    throw new Error(
      `Unable to build Activity Details route for ${item.hash ?? item.type}`,
    );
  }
  return params;
}
