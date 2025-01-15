import React, { ReactChild } from 'react';
import Modal from 'react-native-modal';
import { View } from 'react-native';

import { useTheme } from '../../../../../../util/theme';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './BottomModal.styles';

const OPAQUE_GRAY = '#414141';
interface BottomModalProps {
  children: ReactChild;
  onClose?: () => void;
  hideBackground?: boolean;
}

const BottomModal = ({
  children,
  hideBackground,
  onClose,
}: BottomModalProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});

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
      onSwipeComplete={onClose}
      swipeDirection={'down'}
      propagateSwipe
    >
      <View style={styles.wrapper}>
        <View style={styles.topBar} />
        {children}
      </View>
    </Modal>
  );
};

export default BottomModal;
