import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Routes from '../../../../constants/navigation/Routes';
import TokenList from './Views/TokenList/TokenList';
import Amount, { type AmountParams } from './Views/Amount/Amount';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MemecoinsStackParamList = {
  RampMemecoinsTokenList: undefined;
  RampMemecoinsAmount: AmountParams;
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
  </Stack.Navigator>
);

export default MemecoinsRoutes;
