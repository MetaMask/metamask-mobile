import React from 'react';
import { Modal, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  BottomSheet,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

interface KolDashboardSheetProps {
  isVisible: boolean;
  onClose: () => void;
  testID: string;
  children: React.ReactNode;
}

/**
 * Full-screen host for KolDashboard bottom sheets. BottomSheet lays itself out
 * `absolute inset-0`, so a Modal gives the overlay the whole dashboard to dim.
 */
const KolDashboardSheet: React.FC<KolDashboardSheetProps> = ({
  isVisible,
  onClose,
  testID,
  children,
}) => {
  const sheetRef = React.useRef<BottomSheetRef>(null);

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <BottomSheet ref={sheetRef} onClose={onClose} testID={testID}>
            {children}
          </BottomSheet>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Modal>
  );
};

export default KolDashboardSheet;
