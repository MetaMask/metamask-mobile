import React, { ReactChild } from 'react';
import Modal from 'react-native-modal';
import { StyleSheet } from 'react-native';

import { useTheme } from '../../../../../../util/theme';

const OPAQUE_GRAY = '#414141';
interface BottomModalProps {
  canCloseOnBackdropClick?: boolean;
  children: ReactChild;
  onClose?: () => void;
  hideBackground?: boolean;
}

const styles = StyleSheet.create({
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
});

/**
 * TODO replace BottomModal instances with BottomSheet
 * {@see {@link https://github.com/MetaMask/metamask-mobile/issues/12656}}
 */
const BottomModal = ({ canCloseOnBackdropClick = true, children, hideBackground, onClose }: BottomModalProps) => {
  const { colors } = useTheme();

  return (
    <Modal
      isVisible
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.bottomModal}
      backdropColor={hideBackground ? OPAQUE_GRAY : colors.overlay.default}
      backdropOpacity={1}
      animationInTiming={600}
      animationOutTiming={600}
      onBackButtonPress={onClose}
      onBackdropPress={canCloseOnBackdropClick ? onClose : undefined}
      onSwipeComplete={onClose}
      swipeDirection={'down'}
      propagateSwipe
    >
      {children}
    </Modal>
  );
};

export default BottomModal;
