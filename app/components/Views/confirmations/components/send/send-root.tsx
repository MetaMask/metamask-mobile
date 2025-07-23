import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import Routes from '../../../../../constants/navigation/Routes';
import { SendContextProvider } from '../../context/send-context';
import { Confirm } from '../confirm';

import { Send } from './send';

const Stack = createStackNavigator();

export const SendRoot = () => (
  <SendContextProvider>
    <Stack.Navigator headerMode="screen">
      <Stack.Screen name={Routes.SEND.ROOT} component={Send} />
      <Stack.Screen
        name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
        component={Confirm}
      />
    </Stack.Navigator>
  </SendContextProvider>
);
