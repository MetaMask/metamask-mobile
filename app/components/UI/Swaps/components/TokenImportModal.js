import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, SafeAreaView, View } from 'react-native';
import Modal from 'react-native-modal';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import ModalDragger from '../../../Base/ModalDragger';
import Text from '../../../Base/Text';
import Alert, { AlertType } from '../../../Base/Alert';
import TokenIcon from './TokenIcon';
import StyledButton from '../../StyledButton';
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
      alignItems: 'center',
    },
    alertIcon: {
      paddingTop: 4,
      paddingRight: 8,
    },
    title: {
      fontSize: 24,
      marginVertical: 14,
      color: colors.text.default,
    },
    tokenTitle: {
      fontSize: 18,
      textAlign: 'center',
      marginVertical: 14,
      color: colors.text.default,
    },
    tokenAddress: {
      backgroundColor: colors.background.alternative,
      width: '100%',
      borderRadius: 20,
      marginVertical: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    cta: {
      marginTop: 10,
      width: '100%',
    },
  });

function TokenImportModal({ isVisible, dismiss, token, onPressImport }) {
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
        <ModalDragger borderless />
        <View style={styles.content}>
          <Alert
            type={AlertType.Error}
            renderIcon={() => (
              <FAIcon
                name="info-circle"
                style={styles.alertIcon}
                color={colors.error.default}
                size={15}
              />
            )}
          >
            {(textStyle) => (
              <Text style={textStyle}>{strings('swaps.add_warning')}</Text>
            )}
          </Alert>
          <Text bold primary centered style={styles.title}>
            {strings('swaps.import_token')}
          </Text>
          <TokenIcon biggest icon={token.iconUrl} symbol={token.symbol} />
          <Text bold primary centered style={styles.tokenTitle}>
            {token.name ? `${token.name} (${token.symbol})` : token.symbol}
          </Text>
          <Text primary centered small>
            {strings('swaps.contract')}
          </Text>
          <View style={styles.tokenAddress}>
            <Text small centered numberOfLines={1} adjustsFontSizeToFit>
              {token.address}
            </Text>
          </View>
          <StyledButton
            type="blue"
            containerStyle={styles.cta}
            onPress={onPressImport}
          >
            {strings('swaps.Import')}
          </StyledButton>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

TokenImportModal.propTypes = {
  isVisible: PropTypes.bool,
  dismiss: PropTypes.func,
  token: PropTypes.shape({
    address: PropTypes.string,
    name: PropTypes.string,
    symbol: PropTypes.string,
    decimals: PropTypes.number,
    iconUrl: PropTypes.string,
  }),
  onPressImport: PropTypes.func,
};
export default TokenImportModal;
