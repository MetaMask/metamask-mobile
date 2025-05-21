import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DepositSDKProvider } from '../sdk';
import Root from '../Views/Root';
import Routes from '../../../../constants/navigation/Routes';
import BuildQuote from '../Views/BuildQuote';
import EmailAuth from '../Views/EmailAuth';
import { View } from 'react-native';
import Text from '../../../../component-library/components/Texts/Text';

const Stack = createStackNavigator();

// TODO: Implement VerifyIdentity component
const VerifyIdentity = () => (
  <View>
    <Text>Verify your identity</Text>
  </View>
);

const DepositRoutes = () => (
  <DepositSDKProvider>
    <Stack.Navigator initialRouteName={Routes.DEPOSIT.ROOT}>
      <Stack.Screen name={Routes.DEPOSIT.ROOT} component={Root} />
      <Stack.Screen name={Routes.DEPOSIT.BUILD_QUOTE} component={BuildQuote} />
      <Stack.Screen name={Routes.DEPOSIT.EMAIL_AUTH} component={EmailAuth} />
      <Stack.Screen
        name={Routes.DEPOSIT.ID_VERIFY}
        component={VerifyIdentity}
      />
    </Stack.Navigator>
  </DepositSDKProvider>
);

export default DepositRoutes;
