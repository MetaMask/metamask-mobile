import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { fontStyles } from '../../../../styles/common';
import ActionModal from '../../ActionModal';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';

const createStyles = (colors: any) =>
  StyleSheet.create({
    modal: {
      margin: 0,
      width: '100%',
    },
    modalView: {
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 24,
      width: '100%',
    },
    modalText: {
      ...(fontStyles.normal as any),
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 8,
      color: colors.text.default,
    },
    modalTitle: {
      ...(fontStyles.bold as any),
      fontSize: 22,
      textAlign: 'center',
      color: colors.text.default,
    },
  });

interface Props {
  retryIsOpen: boolean;
  onConfirmPress: () => void;
  onCancelPress: () => void;
  errorMsg: string;
}

const RetryModal = ({ retryIsOpen, onConfirmPress, onCancelPress }: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <ActionModal
      modalStyle={styles.modal}
      modalVisible={retryIsOpen}
      confirmText={strings('transaction_update_retry_modal.retry_button')}
      cancelText={strings('transaction_update_retry_modal.cancel_button')}
      onConfirmPress={onConfirmPress}
      onCancelPress={onCancelPress}
      onRequestClose={onCancelPress}
    >
      <View style={styles.modalView}>
        <Text style={styles.modalTitle}>
          {strings('transaction_update_retry_modal.title')}
        </Text>
        <Text style={styles.modalText}>
          {strings('transaction_update_retry_modal.text')}
        </Text>
      </View>
    </ActionModal>
  );
};

export default RetryModal;
