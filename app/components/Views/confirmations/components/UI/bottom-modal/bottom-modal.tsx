import React, { ReactChild } from 'react';
import Modal from 'react-native-modal';
import { View } from 'react-native';

import { useTheme } from '../../../../../../util/theme';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './bottom-modal.styles';

const OPAQUE_GRAY = '#414141';
interface BottomModalProps {
  children: ReactChild;
  onClose?: () => void;
  hideBackground?: boolean;
  testID?: string;
  visible?: boolean;
}

/**
 * TODO replace BottomModal instances with BottomSheet
 * {@see {@link https://github.com/MetaMask/metamask-mobile/issues/12656}}
 */
const BottomModal = ({
  children,
  hideBackground,
  onClose,
  testID,
  visible = true,
}: BottomModalProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});

  return (
    <Modal
      isVisible={visible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.bottomModal}
      backdropColor={hideBackground ? OPAQUE_GRAY : colors.overlay.default}
      backdropOpacity={1}
      animationInTiming={600}
      animationOutTiming={600}
      onBackButtonPress={onClose}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={'down'}
      propagateSwipe
      testID={testID}
    >
      <View style={styles.wrapper}>
        <View style={styles.topBar} />
        {children}
      </View>
    </Modal>
  );
};

export default BottomModal;
