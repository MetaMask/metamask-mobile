import React from 'react';
import { Modal, View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import PerpsBottomSheetTooltip from '../PerpsBottomSheetTooltip';

export const PERPS_ACCOUNT_UNSUPPORTED_MODAL_GESTURE_ROOT_TEST_ID =
  'perps-account-unsupported-modal-gesture-root';

interface PerpsAccountUnsupportedModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const PerpsAccountUnsupportedModal = ({
  isVisible,
  onClose,
}: PerpsAccountUnsupportedModalProps) => {
  const tw = useTailwind();

  if (!isVisible) {
    return null;
  }

  return (
    // Android compatibility: the View prevents Modal rendering freezes.
    <View>
      <Modal
        visible
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <ModalSafeAreaProvider>
          <GestureHandlerRootView
            style={tw.style('flex-1')}
            testID={PERPS_ACCOUNT_UNSUPPORTED_MODAL_GESTURE_ROOT_TEST_ID}
          >
            <PerpsBottomSheetTooltip
              isVisible
              onClose={onClose}
              contentKey="account_not_supported"
            />
          </GestureHandlerRootView>
        </ModalSafeAreaProvider>
      </Modal>
    </View>
  );
};

export default PerpsAccountUnsupportedModal;
