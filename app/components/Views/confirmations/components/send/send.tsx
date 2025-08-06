import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import Routes from '../../../../../constants/navigation/Routes';
import { SendContextProvider } from '../../context/send-context';
import { Confirm } from '../confirm';

import { SendRoot } from './send-root';

const Stack = createStackNavigator();

export const Send = () => (
  <SendContextProvider>
    <Stack.Navigator headerMode="screen">
      <Stack.Screen name={Routes.SEND.ROOT} component={SendRoot} />
      <Stack.Screen
        name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
        component={Confirm}
      />
    </Stack.Navigator>
  </SendContextProvider>
);
