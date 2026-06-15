import { useCallback } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';

import Routes from '../../../../../constants/navigation/Routes';
import {
  markNavStart,
  NavPerfLabel,
} from '../../../../../util/navigation/navPerf';

export const useSendScreenNavigation = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const gotToSendScreen = useCallback(
    (screen = Routes.SEND.AMOUNT) => {
      if (screen === Routes.SEND.AMOUNT) {
        markNavStart(NavPerfLabel.SendAmount);
      }
      navigation.navigate(Routes.SEND.DEFAULT, {
        screen,
        params: route.params,
      });
    },
    [navigation, route.params],
  );

  return { gotToSendScreen };
};
