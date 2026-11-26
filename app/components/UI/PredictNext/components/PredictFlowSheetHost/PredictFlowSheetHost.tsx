import React from 'react';
import { Modal } from 'react-native';
import { Box } from '@metamask/design-system-react-native';

import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';

interface PredictFlowSheetHostProps {
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * The Modal host every Predict bottom sheet renders into. Keeping the raw
 * `Modal` and the absolute-fill layer here leaves each sheet body on
 * design-system primitives, without a `StyleSheet` or a raw `View`.
 */
export const PredictFlowSheetHost = ({
  onClose,
  children,
}: PredictFlowSheetHostProps) => (
  <Box pointerEvents="box-none" className="absolute inset-0">
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <ModalSafeAreaProvider>{children}</ModalSafeAreaProvider>
    </Modal>
  </Box>
);
