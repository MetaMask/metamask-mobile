import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import LeaderboardScreen from './views/LeaderboardScreen';

const Stack = createStackNavigator();

/**
 * Stack navigator for Leaderboard screens
 */
export const LeaderboardScreenStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen
      name={Routes.LEADERBOARD.HOME}
      component={LeaderboardScreen}
    />
  </Stack.Navigator>
);

export default LeaderboardScreenStack;
