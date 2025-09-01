import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

import Routes from '../../../../../constants/navigation/Routes';

export const useSendScreenNavigation = () => {
  const navigation = useNavigation();

  const gotToSendScreen = useCallback(
    (screen = Routes.SEND.AMOUNT) => {
      navigation.navigate(Routes.SEND.DEFAULT, {
        screen,
      });
    },
    [navigation],
  );

  return { gotToSendScreen };
};
