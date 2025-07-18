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

export function PrivacyOverlay() {
  const [showOverlay, setShowOverlay] = useState(false);
  const { styles } = useStyles(styleSheet, {});

  useEffect(() => {
    const handleAppStateChange = (action: AppStateStatus) => {
      setShowOverlay(() => {
        switch (action) {
          case 'background':
          case 'inactive':
            return true;
          case 'active':
            return false;
          default:
            return false;
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
        handleAppStateChange('inactive'),
      );

      androidFocusListener = AppState.addEventListener('focus', () =>
        handleAppStateChange('active'),
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
