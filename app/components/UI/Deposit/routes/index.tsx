import React, { useEffect, useState, useRef } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DepositSDKProvider, useDepositSDK } from '../sdk';
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

const DepositNavigator = () => {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const { checkExistingToken } = useDepositSDK();
  const hasCheckedToken = useRef(false);

  useEffect(() => {
    const initializeFlow = async () => {
      if (hasCheckedToken.current) return;

      const hasToken = await checkExistingToken();
      setInitialRoute(
        hasToken ? Routes.DEPOSIT.VERIFY_IDENTITY : Routes.DEPOSIT.BUILD_QUOTE,
      );
      hasCheckedToken.current = true;
    };

    initializeFlow();
  }, [checkExistingToken]);

  if (!initialRoute) {
    return null;
  }

  return (
    <Stack.Navigator initialRouteName={initialRoute}>
      <Stack.Screen name={Routes.DEPOSIT.BUILD_QUOTE} component={BuildQuote} />
      <Stack.Screen name={Routes.DEPOSIT.ENTER_EMAIL} component={EnterEmail} />
      <Stack.Screen name={Routes.DEPOSIT.OTP_CODE} component={OtpCode} />
      <Stack.Screen
        name={Routes.DEPOSIT.VERIFY_IDENTITY}
        component={VerifyIdentity}
      />
      <Stack.Screen name={Routes.DEPOSIT.BASIC_INFO} component={BasicInfo} />
    </Stack.Navigator>
  );
};

const DepositRoutes = () => (
  <DepositSDKProvider>
    <DepositNavigator />
  </DepositSDKProvider>
);

export default DepositRoutes;
