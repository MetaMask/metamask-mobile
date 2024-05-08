import React from 'react';
import Modal from 'react-native-modal';
import { StyleSheet } from 'react-native';

import { useTheme } from '../../../../../../util/theme';

const styles = StyleSheet.create({
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
});

const BottomModal = ({ children, onClose }: any) => {
  const { colors } = useTheme();

  return (
    <Modal
      isVisible
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.bottomModal}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
      animationInTiming={600}
      animationOutTiming={600}
      onBackButtonPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={'down'}
      propagateSwipe
    >
      {children}
    </Modal>
  );
};

export default BottomModal;
