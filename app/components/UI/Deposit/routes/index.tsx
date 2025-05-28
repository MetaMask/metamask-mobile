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
import VerifyIdentity from '../Views/VerifyIdentity';

const Stack = createStackNavigator();
const BasicInfo = () => (
  <View>
    {/* eslint-disable-next-line react-native/no-inline-styles */}
    <Text style={{ textAlign: 'center', marginTop: 40 }}>
      Basic Info form placeholder
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
        name={Routes.DEPOSIT.VERIFY_IDENTITY}
        component={VerifyIdentity}
      />
      <Stack.Screen name={Routes.DEPOSIT.BASIC_INFO} component={BasicInfo} />
    </Stack.Navigator>
  </DepositSDKProvider>
);

export default DepositRoutes;
