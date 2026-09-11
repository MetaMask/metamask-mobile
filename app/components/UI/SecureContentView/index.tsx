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
    try {
      nativeSecureContentView =
        requireNativeViewManager<NativeSecureContentViewProps>(
          'ExpoScreenCapture',
        );
    } catch (error) {
      // A JS bundle running against a binary without the native view would
      // otherwise throw here and take down the whole backup/reveal screen.
      nativeSecureContentView = null;
      Logger.error(error as Error, {
        tags: { feature: 'screen-capture-protection' },
        context: {
          name: 'secure_content_view',
          data: { reason: 'native_view_unavailable' },
        },
      });
    }
  }
  return nativeSecureContentView;
};

const SecureContentView: React.FC<ViewProps> = (props) => {
  // The native view locates the secure canvas by a private UIKit class name.
  // If a future iOS release renames it, this degrades to rendering children
  // unprotected and reports it rather than blocking the flow.
  //
  // That is a deliberate trade-off, not an oversight. The two alternatives are
  // worse: refusing to render would break wallet backup and SRP reveal
  // outright until we shipped a fix, and falling back to the window-wide
  // expo-screen-capture block would black out the whole screen and make the
  // app unusable during a recording — the exact behaviour this component
  // exists to avoid. Degrading here lands on the pre-existing behaviour
  // (no iOS capture protection, screenshot warning only), so a broken private
  // API is never worse than shipping without this component at all.
  //
  // The Sentry report is the signal to fix it, not the protection itself.
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
