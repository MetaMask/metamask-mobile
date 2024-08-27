import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import ActionModal from '../../ActionModal';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      textAlign: 'center',
      paddingVertical: 8,
      color: colors.text.default,
    },
    modalTitle: {
      textAlign: 'center',
      color: colors.text.default,
    },
    modalErrText: {
      textAlign: 'center',
      paddingVertical: 8,
      color: colors.error.default,
    },
  });

interface Props {
  retryIsOpen: boolean;
  onConfirmPress: () => void;
  onCancelPress: () => void;
  errorMsg?: string;
}

const RetryModal = ({
  retryIsOpen,
  onConfirmPress,
  onCancelPress,
  errorMsg,
}: Props) => {
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
        <Text variant={TextVariant.HeadingLG} style={styles.modalTitle}>
          {strings('transaction_update_retry_modal.title')}
        </Text>
        {errorMsg ? (
          <Text variant={TextVariant.BodyMD} style={styles.modalErrText}>
            {errorMsg}
          </Text>
        ) : (
          <Text variant={TextVariant.BodyMD} style={styles.modalText}>
            {strings('transaction_update_retry_modal.text')}
          </Text>
        )}
      </View>
    </ActionModal>
  );
};

export default RetryModal;
