import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DepositSDKProvider } from '../sdk';
import Root from '../Views/Root';
import Routes from '../../../../constants/navigation/Routes';
import BuildQuote from '../Views/BuildQuote';
import EnterEmail from '../Views/EnterEmail';
import { View } from 'react-native';
import Text from '../../../../component-library/components/Texts/Text';
import OtpCode from '../Views/OtpCode';

const Stack = createStackNavigator();
const VerifyIdentity = () => (
  <View>
    {/* eslint-disable-next-line react-native/no-inline-styles */}
    <Text style={{ textAlign: 'center', marginTop: 40 }}>
      Verify your identity placeholder
    </Text>
  </View>
);

const DepositRoutes = () => (
  <DepositSDKProvider>
    <Stack.Navigator initialRouteName={Routes.DEPOSIT.ROOT}>
      <Stack.Screen name={Routes.DEPOSIT.ROOT} component={Root} />
      <Stack.Screen name={Routes.DEPOSIT.BUILD_QUOTE} component={BuildQuote} />
      <Stack.Screen name={Routes.DEPOSIT.ENTER_EMAIL} component={EnterEmail} />
      <Stack.Screen name={Routes.DEPOSIT.OTP_CODE} component={OtpCode} />
      <Stack.Screen
        name={Routes.DEPOSIT.ID_VERIFY}
        component={VerifyIdentity}
      />
    </Stack.Navigator>
  </DepositSDKProvider>
);

export default DepositRoutes;
