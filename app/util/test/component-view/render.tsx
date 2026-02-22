import React from 'react';
import { Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import renderWithProvider, { renderScreen } from '../renderWithProvider';

export function renderComponentViewScreen(
  Component: React.ComponentType,
  options: { name: string },
  providerValues?: Parameters<typeof renderScreen>[2],
  initialParams?: Parameters<typeof renderScreen>[3],
) {
  return renderScreen(Component, options, providerValues, initialParams);
}

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
  providerValues?: Parameters<typeof renderScreen>[2],
  initialParams?: Record<string, unknown>,
) {
  const Stack = createStackNavigator();

  const DefaultRouteProbe =
    (routeName: string): React.FC =>
    () => <Text testID={`route-${routeName}`}>{routeName}</Text>;

  const stackTree = (
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
  );

  return renderWithProvider(stackTree, providerValues);
}
