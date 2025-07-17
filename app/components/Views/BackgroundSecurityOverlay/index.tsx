import React, { useState, useEffect } from 'react';
import { AppState, AppStateStatus, StyleSheet, View } from 'react-native';
import { useStyles } from '../../../component-library/hooks/useStyles';
import { Theme } from '../../../util/theme/models';
import Device from '../../../util/device';

export function BackgroundSecurityOverlay() {
  const [showOverlay, setShowOverlay] = useState(false);
  const { styles } = useStyles(
    ({ theme }: { theme: Theme }) => ({
      view: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: theme.colors.background.default,
        zIndex: 1000,
      },
    }),
    {},
  );

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      setShowOverlay((isShowingOverlay) => {
        switch (nextAppState) {
          case 'active':
            return isShowingOverlay === Device.isAndroid();
          case 'background':
            return true;
          default:
            return !isShowingOverlay;
        }
      });
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    let androidBlurListener: { remove: () => void } | undefined;
    let androidFocusListener: { remove: () => void } | undefined;

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
  }, []);

  if (!showOverlay) return null;

  return <View style={styles.view} />;
}
