import { useCallback, useEffect } from 'react';
import { useNavigation, NavigationAction } from '@react-navigation/native';

import Engine from '../../../../core/Engine';
import { useQRSigning } from '../../../../core/HardwareWallet';

/**
 * Intercepts back-navigation on the confirmation screen to cancel any
 * pending QR scan request. This is confirmation-screen-specific because
 * it listens to `beforeRemove` for the current navigation route.
 *
 * Must be called from a component rendered inside both a NavigationContainer
 * and a HardwareWalletProvider.
 */
export const useQRSigningNavigationGuard = () => {
  const navigation = useNavigation();
  const { isSigningQRObject, isRequestCompleted } = useQRSigning();

  const cancelRequest = useCallback(
    (e: { preventDefault: () => void; data: { action: NavigationAction } }) => {
      if (isRequestCompleted) {
        return;
      }
      e.preventDefault();
      if (isSigningQRObject) {
        Engine.getQrKeyringScanner().rejectPendingScan(
          new Error('Request cancelled'),
        );
      }
      navigation.dispatch(e.data.action);
    },
    [isRequestCompleted, navigation, isSigningQRObject],
  );

  useEffect(() => {
    navigation.addListener('beforeRemove', cancelRequest);
    return () => navigation.removeListener('beforeRemove', cancelRequest);
  }, [cancelRequest, navigation]);
};
