import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DeeplinkManager from '../../../core/DeeplinkManager/SharedDeeplinkManager';
import AppConstants from '../../../core/AppConstants';
import Routes from '../../../constants/navigation/Routes';
import { findRouteNameFromNavigatorState } from '../../../util/general';
import { useSelector } from 'react-redux';
import { selectIsUnlocked } from '../../../selectors/keyringController';

/**
 * Screen component that handles pending deeplinks
 * This is a non-visual screen that processes any pending deeplinks
 * when the app is unlocked and not on the lock screen
 */
const PendingDeeplinkHandler = () => {
  const navigation = useNavigation();
  const isUnlocked = useSelector(selectIsUnlocked);
  const route = findRouteNameFromNavigatorState(
    navigation.dangerouslyGetState().routes,
  );
  useEffect(() => {
    const processPendingDeeplink = () => {
      const pendingDeeplink = DeeplinkManager.getPendingDeeplink();

      if (pendingDeeplink && isUnlocked && route !== Routes.LOCK_SCREEN) {
        DeeplinkManager.expireDeeplink();
        DeeplinkManager.parse(pendingDeeplink, {
          origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
        });
      }
    };

    processPendingDeeplink();
  }, [navigation, isUnlocked, route]);

  return <View />;
};

export default PendingDeeplinkHandler;
