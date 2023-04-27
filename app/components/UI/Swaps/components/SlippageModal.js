import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, SafeAreaView, View } from 'react-native';
import Modal from 'react-native-modal';

import ModalDragger from '../../../Base/ModalDragger';
import Text from '../../../Base/Text';
import SlippageSlider from '../../SlippageSlider';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    modal: {
      margin: 0,
      justifyContent: 'flex-end',
    },
    modalView: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
    },
    content: {
      marginVertical: 14,
      paddingHorizontal: 30,
    },
    slippageWrapper: {
      marginVertical: 10,
    },
    warningTextWrapper: {
      position: 'absolute',
      width: '85%',
      bottom: 30,
      left: 10,
    },
    warningText: {
      color: colors.error.default,
    },
  });

function SlippageModal({ isVisible, dismiss, onChange, slippage }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={dismiss}
      onBackButtonPress={dismiss}
      onSwipeComplete={dismiss}
      swipeDirection="down"
      propagateSwipe
      style={styles.modal}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
    >
      <SafeAreaView style={styles.modalView}>
        <ModalDragger />
        <View style={styles.content}>
          <Text bold centered primary>
            {strings('swaps.max_slippage')}
          </Text>

          <View style={styles.slippageWrapper}>
            <View style={styles.warningTextWrapper}>
              {slippage >= 5 && (
                <Text style={styles.warningText}>
                  {strings('swaps.slippage_warning')}
                </Text>
              )}
            </View>
            <SlippageSlider
              range={[1, 5]}
              increment={1}
              onChange={onChange}
              value={slippage}
              formatTooltipText={(text) => `${text}%`}
            />
          </View>

          <Text small centered>
            {strings('swaps.slippage_info')}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

SlippageModal.propTypes = {
  isVisible: PropTypes.bool,
  dismiss: PropTypes.func,
  onChange: PropTypes.func,
  slippage: PropTypes.number,
};
export default SlippageModal;
