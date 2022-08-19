import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    modalView: {
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 24,
      paddingVertical: 24,
    },
    feeWrapper: {
      backgroundColor: colors.background.alternative,
      textAlign: 'center',
      padding: 16,
      borderRadius: 8,
    },
    fee: {
      ...fontStyles.bold,
      fontSize: 16,
      textAlign: 'center',
      color: colors.text.default,
    },
    modalText: {
      ...fontStyles.normal,
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 8,
      color: colors.text.default,
    },
    modalTitle: {
      ...fontStyles.bold,
      fontSize: 22,
      textAlign: 'center',
      color: colors.text.default,
    },
    gasTitle: {
      ...fontStyles.bold,
      fontSize: 16,
      textAlign: 'center',
      marginVertical: 8,
      color: colors.text.default,
    },
    warningText: {
      ...fontStyles.normal,
      fontSize: 12,
      color: colors.error.default,
      paddingVertical: 8,
      textAlign: 'center',
    },
  });

/**
 * View that renders a modal to be used for speed up or cancel transaction modal
 */
export default function TransactionActionContent({
  confirmDisabled,
  feeText,
  titleText,
  gasTitleText,
  descriptionText,
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.modalView}>
      <Text style={styles.modalTitle}>{titleText}</Text>
      <Text style={styles.gasTitle}>{gasTitleText}</Text>
      <View style={styles.feeWrapper}>
        <Text style={styles.fee}>{feeText}</Text>
      </View>
      <Text style={styles.modalText}>{descriptionText}</Text>
      {confirmDisabled && (
        <Text style={styles.warningText}>
          {strings('transaction.insufficient')}
        </Text>
      )}
    </View>
  );
}

TransactionActionContent.defaultProps = {
  cancelButtonMode: 'neutral',
  confirmButtonMode: 'warning',
  cancelText: strings('action_view.cancel'),
  confirmText: strings('action_view.confirm'),
  confirmDisabled: false,
  displayCancelButton: true,
  displayConfirmButton: true,
};

TransactionActionContent.propTypes = {
  /**
   * Whether confirm button is disabled
   */
  confirmDisabled: PropTypes.bool,
  /**
   * Text to show as fee
   */
  feeText: PropTypes.string,
  /**
   * Text to show as tit;e
   */
  titleText: PropTypes.string,
  /**
   * Text to show as title of gas section
   */
  gasTitleText: PropTypes.string,
  /**
   * Text to show as description
   */
  descriptionText: PropTypes.string,
};
