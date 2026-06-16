import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { SendContextProvider } from '../../context/send-context';
import { SendMetricsContextProvider } from '../../context/send-context/send-metrics-context';
import { Confirm } from '../confirm';

import { Amount } from './amount';
import { Asset } from './asset';
import { Recipient } from './recipient';
import { useEmptyNavHeaderForConfirmations } from '../../hooks/ui/useEmptyNavHeaderForConfirmations';

const Stack = createStackNavigator();

const sendScreenOptions = { headerShown: false } as const;

export const Send = () => {
  const { colors } = useTheme();
  const emptyNavHeaderOptions = useEmptyNavHeaderForConfirmations();

  return (
    <SendContextProvider>
      <SendMetricsContextProvider>
        <Stack.Navigator
          screenOptions={{
            cardStyle: { backgroundColor: colors.background.default },
          }}
        >
          <Stack.Screen
            name={Routes.SEND.AMOUNT}
            component={Amount}
            options={sendScreenOptions}
          />
          <Stack.Screen
            name={Routes.SEND.ASSET}
            component={Asset}
            options={sendScreenOptions}
          />
          <Stack.Screen
            name={Routes.SEND.RECIPIENT}
            component={Recipient}
            options={sendScreenOptions}
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
