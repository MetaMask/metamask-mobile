import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import RequestPaymentAsset from './RequestPaymentAsset';
import RequestPaymentAmount from './RequestPaymentAmount';
import RequestPaymentQR from './RequestPaymentQR';

const Stack = createStackNavigator();

const RequestPayment = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName={Routes.REQUEST_PAYMENT.ASSET}
      screenOptions={{
        cardStyle: { backgroundColor: colors.background.default },
        headerStyle: { backgroundColor: colors.background.default },
        headerTintColor: colors.text.default,
      }}
    >
      <Stack.Screen
        name={Routes.REQUEST_PAYMENT.ASSET}
        component={RequestPaymentAsset}
        options={{ title: strings('request_payment.asset_step_title') }}
      />
      <Stack.Screen
        name={Routes.REQUEST_PAYMENT.AMOUNT}
        component={RequestPaymentAmount}
        options={{ title: strings('request_payment.amount_step_title') }}
      />
      <Stack.Screen
        name={Routes.REQUEST_PAYMENT.QR}
        component={RequestPaymentQR}
        options={{ title: strings('request_payment.qr_step_title') }}
      />
    </Stack.Navigator>
  );
};

export default RequestPayment;
