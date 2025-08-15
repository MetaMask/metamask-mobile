import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import Routes from '../../../../../constants/navigation/Routes';
import { SendContextProvider } from '../../context/send-context';
import { SendMetricsContextProvider } from '../../context/send-context/send-metrics-context';
import { Confirm } from '../confirm';

import { Amount } from './amount';
import { Asset } from './asset';
import { Recipient } from './recipient';

const Stack = createStackNavigator();

export const Send = () => (
  <SendContextProvider>
    <SendMetricsContextProvider>
      <Stack.Navigator headerMode="screen">
        <Stack.Screen name={Routes.SEND.AMOUNT} component={Amount} />
        <Stack.Screen name={Routes.SEND.ASSET} component={Asset} />
        <Stack.Screen name={Routes.SEND.RECIPIENT} component={Recipient} />
        <Stack.Screen
          name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
          component={Confirm}
        />
      </Stack.Navigator>
    </SendMetricsContextProvider>
  </SendContextProvider>
);
