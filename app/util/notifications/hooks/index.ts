import { useEffect } from 'react';

import { setupAndroidChannel } from '../setupAndroidChannels';
import Device from '../../../util/device';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

const useNotificationHandler = (
  bootstrapAndroidInitialNotification: () => Promise<void>,
  navigation: NavigationProp<ParamListBase>,
) => {
  useEffect(() => {
    bootstrapAndroidInitialNotification();
    setTimeout(() => {
      if (Device.isAndroid()) {
        setupAndroidChannel();
      }
    }, 1000);
  }, [bootstrapAndroidInitialNotification, navigation]);
};

export default useNotificationHandler;
