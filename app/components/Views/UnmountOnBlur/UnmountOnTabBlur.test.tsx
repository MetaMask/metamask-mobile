import React from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
  type NavigationContainerRefWithCurrent,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import UnmountOnBlur from './index';
import { withUnmountOnTabBlur } from './UnmountOnTabBlur';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const mockMount = jest.fn();
const mockUnmount = jest.fn();

const TrackedTabScreen = () => {
  React.useEffect(() => {
    mockMount();
    return () => mockUnmount();
  }, []);

  return <Text>Tracked tab</Text>;
};

const OtherTabScreen = () => <Text>Other tab</Text>;
const PushedScreen = () => <Text>Pushed screen</Text>;

const renderNavigation = (TrackedTab: React.ComponentType) => {
  const navigationRef = createNavigationContainerRef();

  render(
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs">
          {() => (
            <Tab.Navigator
              tabBar={() => null}
              screenOptions={{ headerShown: false }}
            >
              <Tab.Screen name="TrackedTab" component={TrackedTab} />
              <Tab.Screen name="OtherTab" component={OtherTabScreen} />
            </Tab.Navigator>
          )}
        </Stack.Screen>
        <Stack.Screen name="Pushed" component={PushedScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );

  return navigationRef;
};

const navigateTo = async (
  navigationRef: NavigationContainerRefWithCurrent<ReactNavigation.RootParamList>,
  name: string,
) => {
  await act(async () => {
    navigationRef.navigate(name as never);
  });
};

describe('withUnmountOnTabBlur', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the wrapped tab while it is the selected tab', () => {
    renderNavigation(withUnmountOnTabBlur(TrackedTabScreen));

    expect(screen.getByText('Tracked tab')).toBeOnTheScreen();
    expect(mockMount).toHaveBeenCalledTimes(1);
  });

  it('unmounts the wrapped tab when another tab is selected', async () => {
    const navigationRef = renderNavigation(
      withUnmountOnTabBlur(TrackedTabScreen),
    );

    await navigateTo(navigationRef, 'OtherTab');

    expect(screen.queryByText('Tracked tab')).toBeNull();
    expect(mockUnmount).toHaveBeenCalledTimes(1);
  });

  it('remounts the wrapped tab when it is selected again', async () => {
    const navigationRef = renderNavigation(
      withUnmountOnTabBlur(TrackedTabScreen),
    );

    await navigateTo(navigationRef, 'OtherTab');
    await navigateTo(navigationRef, 'TrackedTab');

    expect(screen.getByText('Tracked tab')).toBeOnTheScreen();
    expect(mockMount).toHaveBeenCalledTimes(2);
  });

  it('keeps the wrapped tab mounted while a parent navigator pushes a screen over the tabs', async () => {
    const navigationRef = renderNavigation(
      withUnmountOnTabBlur(TrackedTabScreen),
    );

    await navigateTo(navigationRef, 'Pushed');

    expect(mockUnmount).not.toHaveBeenCalled();
  });

  it('unmounts on a parent push when using the useIsFocused based UnmountOnBlur, which is why the tab scoped wrapper exists', async () => {
    const FocusScopedTab = () => (
      <UnmountOnBlur>
        <TrackedTabScreen />
      </UnmountOnBlur>
    );

    const navigationRef = renderNavigation(FocusScopedTab);

    await navigateTo(navigationRef, 'Pushed');

    expect(mockUnmount).toHaveBeenCalledTimes(1);
  });

  it('renders the wrapped component when mounted outside a navigator', () => {
    const WrappedScreen = withUnmountOnTabBlur(TrackedTabScreen);

    render(<WrappedScreen />);

    expect(screen.getByText('Tracked tab')).toBeOnTheScreen();
  });

  it('names the wrapper after the wrapped component for debugging', () => {
    const WrappedScreen = withUnmountOnTabBlur(TrackedTabScreen);

    expect(WrappedScreen.displayName).toBe(
      'WithUnmountOnTabBlur(TrackedTabScreen)',
    );
  });
});
