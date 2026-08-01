import React from 'react';
import { Modal, View } from 'react-native';

interface PerpsProPositionsModalPortalProps {
  children: React.ReactNode;
  onRequestClose?: () => void;
}

/**
 * Renders Pro positions panel overlays in a root Modal so BottomSheet
 * positioning is not clipped by the parent ScrollView.
 */
const PerpsProPositionsModalPortal = ({
  children,
  onRequestClose,
}: PerpsProPositionsModalPortalProps) => (
  <View>
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      {children}
    </Modal>
  </View>
);

export default PerpsProPositionsModalPortal;
