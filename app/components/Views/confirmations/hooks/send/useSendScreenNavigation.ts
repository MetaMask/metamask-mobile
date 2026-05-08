import { useCallback } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';

import Routes from '../../../../../constants/navigation/Routes';

export const useSendScreenNavigation = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const gotToSendScreen = useCallback(
    (screen = Routes.SEND.AMOUNT) => {
      navigation.navigate(Routes.SEND.DEFAULT, {
        screen,
        params: route.params,
      });
    },
    [navigation, route.params],
  );

  return { gotToSendScreen };
};
