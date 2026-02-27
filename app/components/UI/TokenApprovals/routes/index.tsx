import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../../constants/navigation/Routes';
import TokenApprovalsView from '../Views/TokenApprovalsView';
import ApprovalDetailSheet from '../components/ApprovalDetailSheet';
import RevokeConfirmSheet from '../components/RevokeConfirmSheet';

const Stack = createStackNavigator();
const ModalStack = createStackNavigator();

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
  },
  animationEnabled: false,
};

const TokenApprovalsScreenStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name={Routes.TOKEN_APPROVALS.VIEW}
      component={TokenApprovalsView}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const TokenApprovalsModalStack = () => (
  <ModalStack.Navigator mode="modal" screenOptions={clearStackNavigatorOptions}>
    <ModalStack.Screen
      name={Routes.TOKEN_APPROVALS.MODALS.APPROVAL_DETAIL}
      component={ApprovalDetailSheet}
      options={{ headerShown: false }}
    />
    <ModalStack.Screen
      name={Routes.TOKEN_APPROVALS.MODALS.REVOKE_CONFIRM}
      component={RevokeConfirmSheet}
      options={{ headerShown: false }}
    />
  </ModalStack.Navigator>
);

export { TokenApprovalsScreenStack, TokenApprovalsModalStack };
