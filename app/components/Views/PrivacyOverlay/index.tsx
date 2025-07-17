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
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      setShowOverlay((prevOverlayState: boolean) => {
        switch (nextAppState) {
          case 'active':
            return prevOverlayState === Device.isAndroid();
          case 'background':
            return true;
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
      androidBlurListener = AppState.addEventListener(
        'blur',
        handleAppStateChange,
      );

      androidFocusListener = AppState.addEventListener(
        'focus',
        handleAppStateChange,
      );
    }

    return () => {
      subscription.remove();
      if (Device.isAndroid()) {
        androidBlurListener?.remove();
        androidFocusListener?.remove();
      }
    };
  }, [showOverlay]);

  if (!showOverlay) return null;

  return <View style={styles.view} testID="privacy-overlay" />;
}
