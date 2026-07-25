import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Routes from '../../../../constants/navigation/Routes';
import TokenList from './Views/TokenList/TokenList';
import Amount from './Views/Amount/Amount';
import Checkout from './Views/Checkout/Checkout';
import type { AmountParams } from './Views/Amount/Amount';
import type { CheckoutParams } from './Views/Checkout/Checkout';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MemecoinsStackParamList = {
  RampMemecoinsTokenList: undefined;
  RampMemecoinsAmount: AmountParams;
  RampMemecoinsCheckout: CheckoutParams;
};

const Stack = createNativeStackNavigator<MemecoinsStackParamList>();

const MemecoinsRoutes = () => (
  <Stack.Navigator
    initialRouteName={Routes.RAMP.MEMECOINS.TOKEN_LIST}
    screenOptions={{ headerShown: false }}
  >
    <Stack.Screen
      name={Routes.RAMP.MEMECOINS.TOKEN_LIST}
      component={TokenList}
    />
    <Stack.Screen name={Routes.RAMP.MEMECOINS.AMOUNT} component={Amount} />
    <Stack.Screen name={Routes.RAMP.MEMECOINS.CHECKOUT} component={Checkout} />
  </Stack.Navigator>
);

export default MemecoinsRoutes;
