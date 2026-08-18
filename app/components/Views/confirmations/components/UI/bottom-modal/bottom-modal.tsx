import React, { ReactNode } from 'react';
import Modal from 'react-native-modal';
import { View } from 'react-native';

import { brandColor } from '@metamask/design-tokens';

import { useTheme } from '../../../../../../util/theme';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './bottom-modal.styles';

const OPAQUE_GRAY = brandColor.grey600;
interface BottomModalProps {
  avoidKeyboard?: boolean;
  children: ReactNode;
  hideBackground?: boolean;
  isTooltip?: boolean;
  onBackButtonPress?: () => void;
  onBackdropPress?: () => void;
  onClose?: () => void;
  onSwipeComplete?: () => void;
  testID?: string;
  visible?: boolean;
}

/**
 * @deprecated Please update your code to use `BottomSheet` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/BottomSheet/README.md}
 * @since @metamask/design-system-react-native@0.11.0
 */
const BottomModal = ({
  avoidKeyboard,
  children,
  hideBackground,
  onBackButtonPress,
  onBackdropPress,
  onClose,
  onSwipeComplete,
  testID,
  visible = true,
  isTooltip = false,
}: BottomModalProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, { isTooltip });

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
      useNativeDriver
      onBackButtonPress={onBackButtonPress ?? onClose}
      onBackdropPress={onBackdropPress ?? onClose}
      onSwipeComplete={onSwipeComplete ?? onClose}
      swipeDirection={'down'}
      propagateSwipe
      testID={testID}
      avoidKeyboard={avoidKeyboard}
    >
      <View style={styles.wrapper}>
        <View style={styles.topBar} />
        {children}
      </View>
    </Modal>
  );
};

export default BottomModal;
