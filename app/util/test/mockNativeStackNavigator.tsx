import React from 'react';

interface MockScreenProps {
  name?: string;
  component?: React.ComponentType<{
    navigation?: Record<string, unknown>;
    route?: { params?: Record<string, unknown> };
  }>;
  children?: React.ReactNode;
  initialParams?: Record<string, unknown>;
}

interface MockNavigatorProps {
  children?: React.ReactNode;
}

/**
 * Version-resilient stub returned by `createNativeStackNavigator` in unit tests.
 *
 * Prefer this over hand-rolled `{ Navigator, Screen }` objects so tests keep a
 * `Group` key (and any future factory keys) without asserting on library
 * option names that change across React Navigation majors.
 */
export function createMockNativeStackNavigator() {
  return {
    Navigator: ({ children }: MockNavigatorProps) => <>{children}</>,
    Group: ({ children }: MockNavigatorProps) => <>{children}</>,
    Screen: ({
      component: Component,
      children,
      initialParams,
    }: MockScreenProps) => {
      if (Component) {
        return (
          <Component navigation={{}} route={{ params: initialParams ?? {} }} />
        );
      }
      return <>{children}</>;
    },
  };
}

/**
 * Drop-in module shape for:
 * `jest.mock('@react-navigation/native-stack', () => require('.../mockNativeStackNavigator').createMockNativeStackModule())`
 */
export function createMockNativeStackModule() {
  return {
    createNativeStackNavigator: () => createMockNativeStackNavigator(),
  };
}
