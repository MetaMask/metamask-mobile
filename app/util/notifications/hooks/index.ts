import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import { Notification } from '../types';

const useNotificationHandler = () => {
  const navigation = useNavigation();
  const handleNotificationPressed = useCallback(
    (notification: Notification) =>
      navigation.navigate(Routes.NOTIFICATIONS.DETAILS, {
        notification,
      }),
    [navigation],
  );

  return {
    handleNotificationPressed,
  };
};

export default useNotificationHandler;
