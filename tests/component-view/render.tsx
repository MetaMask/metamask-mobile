import React from 'react';
import { Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import renderWithProvider, {
  renderScreen,
  type ProviderValues,
} from '../../app/util/test/renderWithProvider';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function withQueryClient(Component: React.ComponentType): React.ComponentType {
  return function WrappedWithQueryClient(props) {
    return (
      <QueryClientProvider client={createQueryClient()}>
        <Component {...props} />
      </QueryClientProvider>
    );
  };
}

export function renderComponentViewScreen(
  Component: React.ComponentType,
  options: Parameters<typeof renderScreen>[1],
  providerValues?: ProviderValues,
  initialParams?: Record<string, unknown>,
) {
  return renderScreen(
    withQueryClient(Component),
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
    Component?: React.ComponentType<unknown>;
  }[],
  providerValues?: ProviderValues,
  initialParams?: Record<string, unknown>,
) {
  const Stack = createStackNavigator();

  const DefaultRouteProbe =
    (routeName: string): React.FC =>
    () => <Text testID={getRouteProbeTestId(routeName)}>{routeName}</Text>;

  const stackTree = (
    <QueryClientProvider client={createQueryClient()}>
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
    </QueryClientProvider>
  );

  return renderWithProvider(stackTree, providerValues);
}
