import React, { useCallback } from 'react';
import { Platform, View, ViewProps } from 'react-native';
import { requireNativeViewManager } from 'expo-modules-core';
import Logger from '../../../util/Logger';

interface SecureCanvasStatus {
  usingSecureCanvas: boolean;
}

interface NativeSecureContentViewProps extends ViewProps {
  onStatus?: (event: { nativeEvent: SecureCanvasStatus }) => void;
}

// Wraps children in a native view whose content is rendered inside a secure
// UITextField's protected canvas layer, so it is excluded from screenshots,
// screen recording, and AirPlay/QuickTime mirroring while staying interactive.
// iOS only: Android blocks capture outright via FLAG_SECURE (ScreenshotDeterrent).
let nativeSecureContentView:
  | React.ComponentType<NativeSecureContentViewProps>
  | null
  | undefined;

// Resolved on first render rather than at import time, so importing this module
// never depends on the native view being registered.
const getNativeSecureContentView = () => {
  if (Platform.OS !== 'ios') {
    return null;
  }
  if (nativeSecureContentView === undefined) {
    nativeSecureContentView =
      requireNativeViewManager<NativeSecureContentViewProps>(
        'ExpoScreenCapture',
      );
  }
  return nativeSecureContentView;
};

const SecureContentView: React.FC<ViewProps> = (props) => {
  // The native view locates the secure canvas by a private UIKit class name.
  // If a future iOS release renames it the view still renders, but without
  // capture protection — report that instead of silently exposing content.
  const handleStatus = useCallback(
    ({ nativeEvent }: { nativeEvent: SecureCanvasStatus }) => {
      if (!nativeEvent.usingSecureCanvas) {
        Logger.error(
          new Error('SecureContentView: secure canvas unavailable'),
          {
            tags: { feature: 'screen-capture-protection' },
            context: {
              name: 'secure_content_view',
              data: { osVersion: Platform.Version },
            },
          },
        );
      }
    },
    [],
  );

  const NativeSecureContentView = getNativeSecureContentView();
  if (!NativeSecureContentView) {
    return <View {...props} />;
  }
  return <NativeSecureContentView {...props} onStatus={handleStatus} />;
};

export default SecureContentView;
