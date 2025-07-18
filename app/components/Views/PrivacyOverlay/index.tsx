import React, { useState, useEffect } from 'react';
import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
  View,
} from 'react-native';
import { useStyles } from '../../../component-library/hooks/useStyles';
import Device from '../../../util/device';
import styleSheet from './PrivacyOverlay.styles';

type ExtendedAppStateStatus = AppStateStatus | 'blur' | 'focus';

export function PrivacyOverlay() {
  const [showOverlay, setShowOverlay] = useState(false);
  const { styles } = useStyles(styleSheet, {});

  useEffect(() => {
    const handleAppStateChange = (action: ExtendedAppStateStatus) => {
      setShowOverlay((prevOverlayState: boolean) => {
        switch (action) {
          case 'background':
          case 'inactive':
          case 'blur':
            return true;
          case 'active':
          case 'focus':
            return false;
          default:
            return !prevOverlayState;
        }
      });
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    let androidBlurListener: NativeEventSubscription;
    let androidFocusListener: NativeEventSubscription;

    if (Device.isAndroid()) {
      androidBlurListener = AppState.addEventListener('blur', () =>
        handleAppStateChange('blur'),
      );

      androidFocusListener = AppState.addEventListener('focus', () =>
        handleAppStateChange('focus'),
      );
    }

    return () => {
      subscription.remove();
      if (Device.isAndroid()) {
        androidBlurListener?.remove();
        androidFocusListener?.remove();
      }
    };
  }, []);

  if (!showOverlay) return null;

  return <View style={styles.view} testID="privacy-overlay" />;
}
