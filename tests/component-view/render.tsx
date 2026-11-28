import React from 'react';
import { Text } from 'react-native';
import type { RenderResult } from '@testing-library/react-native';
import { useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import { createUIQueryClient } from '@metamask/react-data-query';
import type { Json } from '@metamask/utils';
import { Toaster } from '@metamask/design-system-react-native';
import type { DataServiceGranularCacheUpdatedPayload } from '@metamask/base-data-service';
import renderWithProvider, {
  renderScreen,
  type ProviderValues,
} from '../../app/util/test/renderWithProvider';
import Engine from '../../app/core/Engine';
import { DATA_SERVICES } from '../../app/constants/data-services';
import Routes from '../../app/constants/navigation/Routes';

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

/** Design-system toasts render through the app-root Toaster, so view tests mount one too. */
export function ToasterBoundary({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

function withQueryClient(
  Component: React.ComponentType,
  client?: QueryClient,
): React.ComponentType {
  return function WrappedWithQueryClient(props) {
    return (
      <QueryClientBoundary client={client}>
        <ToasterBoundary>
          <Component {...props} />
        </ToasterBoundary>
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
 * Route screen that shows both the route name and its params. The testIDs and
 * text match the hand-written wallet and browser probes.
 */
export const createRouteNameAndParamsProbe =
  (routeName: string): React.FC =>
  () => {
    const route = useRoute();

    return (
      <>
        <Text testID={getRouteProbeTestId(routeName)}>{routeName}</Text>
        <Text testID={getRouteParamsProbeTestId(routeName)}>
          {JSON.stringify(route.params)}
        </Text>
      </>
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
  frame?: (children: React.ReactNode) => React.ReactElement,
) {
  const Stack = createNativeStackNavigator();

  const DefaultRouteProbe =
    (routeName: string): React.FC =>
    () => <Text testID={getRouteProbeTestId(routeName)}>{routeName}</Text>;

  const stackTree = (
    <QueryClientBoundary client={queryClient}>
      <ToasterBoundary>
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
      </ToasterBoundary>
    </QueryClientBoundary>
  );

  return renderWithProvider(
    frame ? frame(stackTree) : stackTree,
    providerValues,
  );
}

/** Entry route for screens rendered only to navigate into the browser home probe. */
const BROWSER_HOME_PROBE_ENTRY_ROUTE = 'BrowserHomeProbeEntry';

/**
 * Renders `Component` on a stack whose browser-home route is a params probe.
 * `state` is the Redux fixture for that screen (any preset's built state).
 */
export function renderWithBrowserHomeProbe(
  Component: React.ComponentType,
  state: ProviderValues['state'],
): ReturnType<typeof renderScreenWithRoutes> {
  return renderScreenWithRoutes(
    Component,
    { name: BROWSER_HOME_PROBE_ENTRY_ROUTE },
    [
      {
        name: Routes.BROWSER.HOME,
        Component: createRouteParamsProbe(Routes.BROWSER.HOME),
      },
    ],
    { state },
  );
}

/**
 * Waits for the params probe registered for `routeName`, asserts it is on
 * screen, and returns the navigation params that screen received.
 */
export async function findRouteParams(
  findByTestId: RenderResult['findByTestId'],
  routeName: string,
): Promise<unknown> {
  const routeParams = await findByTestId(getRouteParamsProbeTestId(routeName));

  expect(routeParams).toBeOnTheScreen();

  const { children } = routeParams.props;
  if (typeof children !== 'string') {
    throw new Error(
      `Route params probe for "${routeName}" did not render JSON params`,
    );
  }

  return JSON.parse(children);
}
