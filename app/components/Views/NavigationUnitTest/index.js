/**
 * This view was created in order to test the navigation api since it's possible it can change even with minor upgrades.
 * For reference see: https://reactnavigation.org/docs/navigation-prop/#dangerouslygetstate
 */

/* eslint-disable react/prop-types */
/* eslint-disable react/no-unstable-nested-components */
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { useActiveRouteName } from '../../../util/navigation';
import { Text } from 'react-native';

const Stack = createStackNavigator();

/**
 * Test screen used to test React Navigation API
 *
 * @param {Object} props Screen props
 * @param {Object} props.route Route
 * @param {Object} props.route.params Route params
 * @param {string} props.route.params.screenName Route name
 * @returns
 */
const TestScreen = ({ route }) => {
  // Get active route name
  const name = useActiveRouteName();

  // Check if the active route name is the same as the route name
  if (name !== route.params.screenName)
    throw new Error(
      'Error, react navigation api changed: https://reactnavigation.org/docs/navigation-prop/#dangerouslygetstate',
    );

  return <Text>{name} THIS SHOULD NOT HAVE CHANGED, take a deeper look</Text>;
};

const TestSubStack = () => (
  <Stack.Navigator initialRouteName="TestScreen">
    <Stack.Screen
      name="TestScreen3"
      component={TestScreen}
      initialParams={{ screenName: 'TestScreen3' }}
    />
  </Stack.Navigator>
);

const TestStack = ({ secondRoute }) => (
  <Stack.Navigator initialRouteName={secondRoute || 'TestSubStack'}>
    <Stack.Screen name="TestSubStack" component={TestSubStack} />
    <Stack.Screen
      name="TestScreen2"
      component={TestScreen}
      initialParams={{ screenName: 'TestScreen2' }}
    />
  </Stack.Navigator>
);

const NavigationUnitTest = ({ firstRoute, secondRoute }) => (
  <NavigationContainer>
    <Stack.Navigator initialRouteName={firstRoute || 'TestStack'}>
      <Stack.Screen name="TestStack" component={TestStack} />
      <Stack.Screen
        name="TestScreen1"
        component={TestScreen}
        initialParams={{ screenName: 'TestScreen1' }}
      />
    </Stack.Navigator>
  </NavigationContainer>
);

const NavigationUnitTestFactory = ({ firstRoute, secondRoute }) => (
  <NavigationUnitTest firstRoute={firstRoute} secondRoute={secondRoute} />
);

export default NavigationUnitTestFactory;
