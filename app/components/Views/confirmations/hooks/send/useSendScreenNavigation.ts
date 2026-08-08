import { useCallback } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import Routes from '../../../../../constants/navigation/Routes';

export type SendStackScreen =
  | typeof Routes.SEND.ASSET
  | typeof Routes.SEND.RECIPIENT
  | typeof Routes.SEND.AMOUNT;

export const useSendScreenNavigation = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();

  const gotToSendScreen = useCallback(
    (screen: SendStackScreen = Routes.SEND.AMOUNT) => {
      navigation.navigate(Routes.SEND.DEFAULT, {
        screen,
        params: route.params,
      });
    },
    [navigation, route.params],
  );

  return { gotToSendScreen };
};
