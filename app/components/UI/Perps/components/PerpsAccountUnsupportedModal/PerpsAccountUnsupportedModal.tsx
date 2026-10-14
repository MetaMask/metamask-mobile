import React from 'react';
import { Modal, View } from 'react-native';
import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import PerpsBottomSheetTooltip from '../PerpsBottomSheetTooltip';

interface PerpsAccountUnsupportedModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const PerpsAccountUnsupportedModal = ({
  isVisible,
  onClose,
}: PerpsAccountUnsupportedModalProps) => {
  if (!isVisible) {
    return null;
  }

  return (
    // Android compatibility: the View prevents Modal rendering freezes.
    <View>
      <Modal visible transparent animationType="none" statusBarTranslucent>
        <ModalSafeAreaProvider>
          <PerpsBottomSheetTooltip
            isVisible
            onClose={onClose}
            contentKey="account_not_supported"
          />
        </ModalSafeAreaProvider>
      </Modal>
    </View>
  );
};

export default PerpsAccountUnsupportedModal;
