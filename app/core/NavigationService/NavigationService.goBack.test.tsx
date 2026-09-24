import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NavigationService from './NavigationService';
import Routes from '../../constants/navigation/Routes';

const Wrapper = createNativeStackNavigator();
const App = createNativeStackNavigator();
const Settings = createNativeStackNavigator();
const Screen = () => <Text>Screen</Text>;

const SettingsStack = () => (
  <Settings.Navigator>
    <Settings.Screen name="Settings" component={Screen} />
    <Settings.Screen
      name={Routes.SETTINGS.DEVELOPER_OPTIONS}
      component={Screen}
    />
  </Settings.Navigator>
);

const AppStack = () => (
  <App.Navigator>
    <App.Screen name={Routes.SETTINGS_VIEW} component={SettingsStack} />
    <App.Screen name={Routes.CONFIRMATION_REQUEST_MODAL} component={Screen} />
  </App.Navigator>
);

describe('NavigationService focused goBack', () => {
  afterEach(() => NavigationService.resetForTesting());

  it('dismisses the confirmation beneath NavigationChildren without popping Settings', () => {
    const ref = createNavigationContainerRef();
    render(
      <NavigationContainer
        ref={ref}
        initialState={{
          index: 0,
          routes: [
            {
              name: 'NavigationChildren',
              state: {
                index: 1,
                routes: [
                  {
                    name: Routes.SETTINGS_VIEW,
                    state: {
                      index: 1,
                      routes: [
                        { name: 'Settings' },
                        { name: Routes.SETTINGS.DEVELOPER_OPTIONS },
                      ],
                    },
                  },
                  { name: Routes.CONFIRMATION_REQUEST_MODAL },
                ],
              },
            },
          ],
        }}
      >
        <Wrapper.Navigator>
          <Wrapper.Screen name="NavigationChildren" component={AppStack} />
        </Wrapper.Navigator>
      </NavigationContainer>,
    );
    NavigationService.navigation = ref;
    expect(ref.getCurrentRoute()?.name).toBe(Routes.CONFIRMATION_REQUEST_MODAL);
    const settingsBefore = ref.getRootState().routes[0].state?.routes[0];

    act(() => NavigationService.navigation.goBack());

    const rootState = ref.getRootState();
    expect(rootState.routes).toHaveLength(1);
    expect(rootState.routes[0].name).toBe('NavigationChildren');
    expect(rootState.routes[0].state?.routes).toEqual([settingsBefore]);
    expect(ref.getCurrentRoute()?.name).toBe(Routes.SETTINGS.DEVELOPER_OPTIONS);
  });
});
