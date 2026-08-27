import React from 'react';
import { Modal, type ModalProps, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ModalSafeAreaProvider from '../../../../../../component-library/components-temp/ModalSafeAreaProvider';

export const PERPS_PRO_MODAL_GESTURE_ROOT_TEST_ID =
  'perps-pro-modal-gesture-root';

interface PerpsProModalPortalProps {
  children: React.ReactNode;
  onRequestClose?: () => void;
  animationType?: ModalProps['animationType'];
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
});

/**
 * Renders Pro overlays outside width-constrained or scrollable layouts.
 *
 * Android gives each React Native Modal its own native view hierarchy, so the
 * app-level GestureHandlerRootView does not cover modal content. The nested
 * gesture root keeps BottomSheet swipe gestures and controls such as Slider
 * interactive on Android.
 *
 * For the same reason the root SafeAreaProvider measures the activity window
 * rather than this modal's window, reporting a bottom inset of 0 and collapsing
 * BottomSheetDialog's bottom padding — which leaves sheet footers under the
 * navigation bar. ModalSafeAreaProvider measures this window instead (Android
 * only; iOS already reports correct insets here).
 */
const PerpsProModalPortal = ({
  children,
  onRequestClose,
  animationType = 'none',
}: PerpsProModalPortalProps) => (
  // The plain View prevents Android rendering freezes around transparent
  // Modals. Keep it outside the Modal and gesture root.
  <View>
    <Modal
      visible
      transparent
      animationType={animationType}
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      <ModalSafeAreaProvider>
        <GestureHandlerRootView
          style={styles.gestureRoot}
          testID={PERPS_PRO_MODAL_GESTURE_ROOT_TEST_ID}
        >
          {children}
        </GestureHandlerRootView>
      </ModalSafeAreaProvider>
    </Modal>
  </View>
);

export default PerpsProModalPortal;
