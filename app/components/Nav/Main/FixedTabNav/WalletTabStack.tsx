import React, { useMemo } from 'react';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import Routes from '../../../../constants/navigation/Routes';
import { useTheme } from '../../../../util/theme';
import Wallet from '../../../Views/Wallet';
import { RevealPrivateCredential } from '../../../Views/RevealPrivateCredential';
import { withRouteMessenger } from '../../../../messengers/helpers/route-messenger-helpers';
import { ALLOWED_CAPABILITIES as WALLET_ROUTE_ALLOWED_CAPABILITIES } from '../../../Views/Wallet/messenger';

const Stack = createNativeStackNavigator();

const WalletWithMessenger = withRouteMessenger(Wallet, {
  capabilities: WALLET_ROUTE_ALLOWED_CAPABILITIES,
});

const useWalletStackScreenOptions = (): NativeStackNavigationOptions => {
  const { colors } = useTheme();
  return useMemo(
    () => ({
      headerShown: false,
      contentStyle: { backgroundColor: colors.background.default },
    }),
    [colors.background.default],
  );
};

/** Home tab. Wallet home only — no content pills. */
const WalletTabStack = () => {
  const screenOptions = useWalletStackScreenOptions();

  return (
    <Stack.Navigator
      initialRouteName="WalletView"
      screenOptions={screenOptions}
    >
      <Stack.Screen
        name="WalletView"
        component={WalletWithMessenger}
        options={{ animation: 'none' }}
      />
      <Stack.Screen
        name={Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL}
        component={RevealPrivateCredential}
      />
    </Stack.Navigator>
  );
};

export default WalletTabStack;
