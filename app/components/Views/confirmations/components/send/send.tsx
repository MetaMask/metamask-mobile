import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import Routes from '../../../../../constants/navigation/Routes';
import { SendContextProvider } from '../../context/send-context';
import { Confirm } from '../confirm';

import { Amount } from './amount';
import { Asset } from './asset';
import { SendTo } from './send-to';

const Stack = createStackNavigator();

export const Send = () => (
  <SendContextProvider>
    <Stack.Navigator headerMode="screen">
      <Stack.Screen name={Routes.SEND.AMOUNT} component={Amount} />
      <Stack.Screen name={Routes.SEND.ASSET} component={Asset} />
      <Stack.Screen name={Routes.SEND.RECIPIENT} component={SendTo} />
      <Stack.Screen
        name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
        component={Confirm}
      />
    </Stack.Navigator>
  </SendContextProvider>
);
