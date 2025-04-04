import React from 'react';
import { StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import { useTheme } from '../../../util/theme';

export interface ApprovalModalProps {
  isVisible: boolean;
  onCancel: () => void;
  children: React.ReactNode;
}

const styles = StyleSheet.create({
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
});

const ApprovalModal = (props: ApprovalModalProps) => {
  const { colors } = useTheme();

  return (
    <Modal
      isVisible={props.isVisible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.bottomModal}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
      animationInTiming={600}
      animationOutTiming={600}
      onBackdropPress={props.onCancel}
      onSwipeComplete={props.onCancel}
      swipeDirection={'down'}
      propagateSwipe
    >
      {props.children}
    </Modal>
  );
};

export default ApprovalModal;
