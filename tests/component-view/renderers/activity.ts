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
import ActivityView from '../../../app/components/Views/ActivityView';
import ActivityTypeFilterSheet from '../../../app/components/Views/ActivityScreen/components/ActivityTypeFilterSheet';
import PerpsActivityFilterSheet from '../../../app/components/Views/ActivityScreen/components/PerpsActivityFilterSheet';
import ActivityNetworkFilterSheet from '../../../app/components/Views/ActivityScreen/components/ActivityNetworkFilterSheet';
import { HardwareWalletProvider } from '../../../app/core/HardwareWallet/HardwareWalletProvider';
import {
  getRouteProbeTestId,
  renderComponentViewScreen,
  renderScreenWithRoutes,
} from '../render';
import {
  initialStateActivity,
  initialStateActivityWithRedesignEnabled,
} from '../presets/activity';
import { QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import { createUIQueryClient } from '@metamask/react-data-query';
import type { Json } from '@metamask/utils';
import Engine from '../../../app/core/Engine';
import { DATA_SERVICES } from '../../../app/constants/data-services';
import { Text } from 'react-native';

notifyManager.setBatchNotifyFunction((callback) => callback());

type JsonSubscriptionCallback = (data: Json) => void;

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

interface RenderActivityViewOptions {
  overrides?: DeepPartial<RootState>;
  redesignEnabled?: boolean;
}

interface RenderActivityViewWithRoutesOptions
  extends RenderActivityViewOptions {
  extraRoutes: { name: string; Component?: React.ComponentType<object> }[];
}

function ActivityViewWithProviders() {
  return React.createElement(
    HardwareWalletProvider,
    null,
    React.createElement(ActivityView as unknown as React.ComponentType),
  );
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

function buildActivityState(options: {
  overrides?: DeepPartial<RootState>;
  state?: DeepPartial<RootState>;
  redesignEnabled?: boolean;
}) {
  if (options.state) {
    return options.state;
  }

  const builder = options.redesignEnabled
    ? initialStateActivityWithRedesignEnabled()
    : initialStateActivity();
  if (options.overrides) {
    builder.withOverrides(options.overrides);
  }

  return builder.build();
}

function ActivityFilterRootModalFlow() {
  const ModalStack = createNativeStackNavigator();
  return React.createElement(
    ModalStack.Navigator,
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
}

/** ActivityScreen + RootModalFlow for Type/Perps/Network filter sheets. */
function renderActivityScreenWithFilterModals(
  options: RenderActivityScreenViewOptions & {
    extraRoutes?: { name: string; Component?: React.ComponentType<object> }[];
  },
): ReturnType<typeof renderWithProvider> {
  const state = buildActivityState(options);
  const RootStack = createNativeStackNavigator();
  const DefaultRouteProbe =
    (routeName: string): React.FC =>
    () =>
      React.createElement(
        Text,
        { testID: getRouteProbeTestId(routeName) },
        routeName,
      );

  const screens = [
    React.createElement(RootStack.Screen, {
      key: Routes.TRANSACTIONS_VIEW,
      name: Routes.TRANSACTIONS_VIEW,
      component: ActivityScreenWithProviders,
      initialParams: options.params,
    }),
    React.createElement(RootStack.Screen, {
      key: Routes.MODAL.ROOT_MODAL_FLOW,
      name: Routes.MODAL.ROOT_MODAL_FLOW,
      component: ActivityFilterRootModalFlow,
    }),
    ...(options.extraRoutes ?? []).map(({ name, Component: Extra }) =>
      React.createElement(RootStack.Screen, {
        key: name,
        name,
        component: Extra ?? DefaultRouteProbe(name),
      }),
    ),
  ];

  return renderWithProvider(
    React.createElement(
      QueryClientProvider,
      { client: createQueryClient() },
      React.createElement(
        RootStack.Navigator,
        { screenOptions: { headerShown: false } },
        ...screens,
      ),
    ),
    { state },
  );
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

export function renderActivityView(
  options: RenderActivityViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const state = buildActivityState({
    overrides: options.overrides,
    redesignEnabled: options.redesignEnabled,
  });

  return renderComponentViewScreen(
    ActivityViewWithProviders,
    { name: Routes.TRANSACTIONS_VIEW },
    { state },
  );
}

export function renderActivityViewWithRoutes(
  options: RenderActivityViewWithRoutesOptions,
): ReturnType<typeof renderScreenWithRoutes> {
  const state = buildActivityState({
    overrides: options.overrides,
    redesignEnabled: options.redesignEnabled,
  });

  return renderScreenWithRoutes(
    ActivityViewWithProviders,
    { name: Routes.TRANSACTIONS_VIEW },
    options.extraRoutes,
    { state },
  );
}
