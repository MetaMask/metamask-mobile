import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import StakeInputView from '../Views/InputView/StakeInputView';
import LearnMoreTooltip from '../components/LearnMoreTooltip';
import Routes from '../../../../constants/navigation/Routes';
const Stack = createStackNavigator();
const ModalStack = createStackNavigator();

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
  },
  animationEnabled: false,
};

// Regular Stack for Screens
const StakeScreenStack = () => (
  <Stack.Navigator>
    <Stack.Screen name={Routes.STAKE.STAKE} component={StakeInputView} />
  </Stack.Navigator>
);

// Modal Stack for Modals
const StakeModalStack = () => (
  <ModalStack.Navigator
    mode={'modal'}
    screenOptions={clearStackNavigatorOptions}
  >
    <ModalStack.Screen
      name={Routes.STAKE.MODAL.LEARN_MORE}
      component={LearnMoreTooltip}
      options={{ headerShown: false }}
    />
  </ModalStack.Navigator>
);

export { StakeScreenStack, StakeModalStack };
