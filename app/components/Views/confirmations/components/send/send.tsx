import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SendContextProvider } from '../../context/send-context';
import { SendMetricsContextProvider } from '../../context/send-context/send-metrics-context';
import { Confirm } from '../confirm';
import { useSendNavbar } from '../../hooks/send/useSendNavbar';
import { Amount } from './amount';
import { Asset } from './asset';
import { Recipient } from './recipient';
import { type RootParamList } from '../../../../../util/navigation/types';

const Stack = createStackNavigator<RootParamList>();

export const Send = () => {
  const sendNavigationOptions = useSendNavbar();

  return (
    <SendContextProvider>
      <SendMetricsContextProvider>
        <Stack.Navigator screenOptions={{ headerMode: 'screen' }}>
          <Stack.Screen
            name={'Amount'}
            component={Amount}
            options={sendNavigationOptions.Amount}
          />
          <Stack.Screen
            name={'SendAsset'}
            component={Asset}
            options={sendNavigationOptions.Asset}
          />
          <Stack.Screen
            name={'Recipient'}
            component={Recipient}
            options={sendNavigationOptions.Recipient}
          />
          <Stack.Screen name={'RedesignedConfirmations'} component={Confirm} />
        </Stack.Navigator>
      </SendMetricsContextProvider>
    </SendContextProvider>
  );
};
