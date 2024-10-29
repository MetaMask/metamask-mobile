import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import StakeInputView from '../Views/StakeInputView/StakeInputView';
import LearnMoreModal from '../components/LearnMoreModal';
import Routes from '../../../../constants/navigation/Routes';
import StakeConfirmationView from '../Views/StakeConfirmationView/StakeConfirmationView';
import UnstakeInputView from '../Views/UnstakeInputView/UnstakeInputView';
import UnstakeConfirmationView from '../Views/UnstakeConfirmationView/UnstakeConfirmationView';
import { StakeSDKProvider } from '../sdk/stakeSdkProvider';
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
  <StakeSDKProvider>
    <Stack.Navigator>
      <Stack.Screen name={Routes.STAKING.STAKE} component={StakeInputView} />
      <Stack.Screen
        name={Routes.STAKING.UNSTAKE}
        component={UnstakeInputView}
      />
      <Stack.Screen
        name={Routes.STAKING.STAKE_CONFIRMATION}
        component={StakeConfirmationView}
      />
                                <Stack.Screen
                                name={Routes.STAKING.UNSTAKE_CONFIRMATION}
                                component={UnstakeConfirmationView}
                                />
    </Stack.Navigator>
  </StakeSDKProvider>
);

// Modal Stack for Modals
const StakeModalStack = () => (
  <StakeSDKProvider>
    <ModalStack.Navigator
      mode={'modal'}
      screenOptions={clearStackNavigatorOptions}
    >
      <ModalStack.Screen
        name={Routes.STAKING.MODALS.LEARN_MORE}
        component={LearnMoreModal}
        options={{ headerShown: false }}
      />
    </ModalStack.Navigator>
  </StakeSDKProvider>
);

export { StakeScreenStack, StakeModalStack };
