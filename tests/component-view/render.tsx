import React from 'react';
import { Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import { createUIQueryClient } from '@metamask/react-data-query';
import type { Json } from '@metamask/utils';
import type { DataServiceGranularCacheUpdatedPayload } from '@metamask/base-data-service';
import renderWithProvider, {
  renderScreen,
  type ProviderValues,
} from '../../app/util/test/renderWithProvider';
import Engine from '../../app/core/Engine';
import { DATA_SERVICES } from '../../app/constants/data-services';

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

export function createComponentViewQueryClient() {
  return createUIQueryClient(DATA_SERVICES, dataServiceMessenger, {
    defaultOptions: { queries: { retry: false } },
  });
}

function QueryClientBoundary({
  children,
  client,
}: {
  children: React.ReactNode;
  /** A caller-owned client, for tests that must keep the cache across a
   * remount (for example when driving a reset). */
  client?: QueryClient;
}) {
  const [createdClient] = React.useState(createComponentViewQueryClient);
  const queryClient = client ?? createdClient;

  React.useEffect(
    () => () => {
      // A caller-owned client outlives the render: clear only our own.
      if (!client) {
        createdClient.clear();
      }
    },
    [client, createdClient],
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function withQueryClient(
  Component: React.ComponentType,
  client?: QueryClient,
): React.ComponentType {
  return function WrappedWithQueryClient(props) {
    return (
      <QueryClientBoundary client={client}>
        <Component {...props} />
      </QueryClientBoundary>
    );
  };
}

export function renderComponentViewScreen(
  Component: React.ComponentType,
  options: Parameters<typeof renderScreen>[1],
  providerValues?: ProviderValues,
  initialParams?: Record<string, unknown>,
  queryClient?: QueryClient,
) {
  return renderScreen(
    withQueryClient(Component, queryClient),
    options,
    providerValues,
    initialParams,
  );
}

export const getRouteProbeTestId = (routeName: string) => `route-${routeName}`;

export const getRouteParamsProbeTestId = (routeName: string) =>
  `route-${routeName}-params`;

export const createRouteParamsProbe =
  (routeName: string): React.FC =>
  () => {
    const route = useRoute();

    return (
      <Text testID={getRouteParamsProbeTestId(routeName)}>
        {JSON.stringify(route.params)}
      </Text>
    );
  };

/**
 * Render a screen with additional registered routes to assert navigation without mocking.
 * Each extra route can provide a simple component; if omitted, a default probe will render the route name.
 */
export function renderScreenWithRoutes(
  Component: React.ComponentType,
  options: { name: string },
  extraRoutes: {
    name: string;
    Component?: React.ComponentType<object>;
  }[],
  providerValues?: ProviderValues,
  initialParams?: Record<string, unknown>,
  queryClient?: QueryClient,
) {
  const Stack = createNativeStackNavigator();

  const DefaultRouteProbe =
    (routeName: string): React.FC =>
    () => <Text testID={getRouteProbeTestId(routeName)}>{routeName}</Text>;

  const stackTree = (
    <QueryClientBoundary client={queryClient}>
      <Stack.Navigator>
        <Stack.Screen
          name={options.name}
          component={Component}
          initialParams={initialParams}
        />
        {extraRoutes.map(({ name, Component: Extra }) => (
          <Stack.Screen
            key={name}
            name={name}
            component={Extra ?? DefaultRouteProbe(name)}
          />
        ))}
      </Stack.Navigator>
    </QueryClientBoundary>
  );

  return renderWithProvider(stackTree, providerValues);
}
