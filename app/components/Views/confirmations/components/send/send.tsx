import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import Routes from '../../../../../constants/navigation/Routes';
import { SendContextProvider } from '../../context/send-context';
import { SendMetricsContextProvider } from '../../context/send-context/send-metrics-context';
import { Confirm } from '../confirm';
import { useSendNavbar } from '../../hooks/send/useSendNavbar';

import { Amount } from './amount';
import { Asset } from './asset';
import { Recipient } from './recipient';
import { useEmptyNavHeaderForConfirmations } from '../../hooks/ui/useEmptyNavHeaderForConfirmations';

const Stack = createStackNavigator();

export const Send = () => {
  const sendNavigationOptions = useSendNavbar();
  const emptyNavHeaderOptions = useEmptyNavHeaderForConfirmations();

  return (
    <SendContextProvider>
      <SendMetricsContextProvider>
        <Stack.Navigator screenOptions={{ headerShown: true }}>
          <Stack.Screen
            name={Routes.SEND.AMOUNT}
            component={Amount}
            options={sendNavigationOptions.Amount}
          />
          <Stack.Screen
            name={Routes.SEND.ASSET}
            component={Asset}
            options={sendNavigationOptions.Asset}
          />
          <Stack.Screen
            name={Routes.SEND.RECIPIENT}
            component={Recipient}
            options={sendNavigationOptions.Recipient}
          />
          <Stack.Screen
            name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
            component={Confirm}
            options={emptyNavHeaderOptions}
          />
        </Stack.Navigator>
      </SendMetricsContextProvider>
    </SendContextProvider>
  );
};
