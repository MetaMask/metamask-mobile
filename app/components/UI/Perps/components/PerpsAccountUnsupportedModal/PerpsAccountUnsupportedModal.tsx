import React from 'react';
import { Modal, View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import { PerpsAccountUnsupportedModalSelectorsIDs } from '../../Perps.testIds';
import PerpsBottomSheetTooltip from '../PerpsBottomSheetTooltip';

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
            testID={PerpsAccountUnsupportedModalSelectorsIDs.GESTURE_ROOT}
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
