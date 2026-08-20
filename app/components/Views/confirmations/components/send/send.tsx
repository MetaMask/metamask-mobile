import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { SendContextProvider } from '../../context/send-context';
import { SendMetricsContextProvider } from '../../context/send-context/send-metrics-context';
import { Confirm } from '../confirm';

import { Amount } from './amount';
import { Asset } from './asset';
import { Recipient } from './recipient';
import { useEmptyNavHeaderForConfirmations } from '../../hooks/ui/useEmptyNavHeaderForConfirmations';
import type { SendStackParamList } from './types/navigation';

const Stack = createNativeStackNavigator<SendStackParamList>();

// With native-stack, custom React headers rendered by the navigator linger on
// screen during the push/pop animation. Each send screen instead renders its
// own HeaderCompactStandard in-body (see the screen components) so the header
// transitions natively with the screen content.
const sendScreenOptions = { headerShown: false } as const;

export const Send = () => {
  const { colors } = useTheme();
  const emptyNavHeaderOptions = useEmptyNavHeaderForConfirmations();

  return (
    <SendContextProvider>
      <SendMetricsContextProvider>
        <Stack.Navigator
          screenOptions={{
            contentStyle: { backgroundColor: colors.background.default },
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
