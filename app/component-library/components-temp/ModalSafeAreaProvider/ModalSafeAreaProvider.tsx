// Third party dependencies.
import React from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export interface ModalSafeAreaProviderProps {
  children: React.ReactNode;
  testID?: string;
}

/**
 * Restores real safe-area insets for content rendered inside a react-native
 * `Modal` on Android.
 *
 * On Android a `Modal` is its own window, and `statusBarTranslucent` makes it
 * draw under the system bars. The root `SafeAreaProvider` measures the activity
 * window — which is not edge-to-edge below Android 15 — so `useSafeAreaInsets()`
 * reports a bottom inset of 0 inside the modal. Any sheet whose bottom padding
 * derives from that inset then collapses, leaving its footer button under the
 * navigation bar. A nested provider measures the modal's own window instead.
 *
 * iOS does not have this problem: a modal covers the full screen and the root
 * provider already reports the correct insets. The nested provider is therefore
 * applied on Android only, so iOS keeps its existing (correct) inset source.
 *
 * @param props.children Modal content that reads safe-area insets.
 * @param props.testID Optional test ID applied to the Android provider.
 */
const ModalSafeAreaProvider: React.FC<ModalSafeAreaProviderProps> = ({
  children,
  testID,
}) => {
  if (Platform.OS !== 'android') {
    return <>{children}</>;
  }

  return <SafeAreaProvider testID={testID}>{children}</SafeAreaProvider>;
};

export default ModalSafeAreaProvider;
