import React from 'react';
import { StyleSheet, View } from 'react-native';
import Modal from 'react-native-modal';
import { useTheme } from '../../../util/theme';
import Text from '../../../component-library/components/Texts/Text';
import Device from '../../../util/device';
import { ThemeColors } from '@metamask/design-tokens';

interface Props {
  isVisible: boolean;
  dismiss: () => void;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  root: {
    backgroundColor: colors.background.default,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 200,
    maxHeight: '95%',
    paddingTop: 24,
    paddingBottom: Device.isIphoneX() ? 32 : 24,
  },
});


export const SwapsSTXStatusModal = ({ isVisible, dismiss }: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <Modal
      isVisible={isVisible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.bottomModal}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
      animationInTiming={600}
      animationOutTiming={600}
      onBackdropPress={dismiss}
      onBackButtonPress={dismiss}
      onSwipeComplete={dismiss}
      swipeDirection={'down'}
      propagateSwipe
    >
      <View style={styles.root}>
        <Text>Swaps STX Status Modal</Text>
      </View>
    </Modal>
  );
};
