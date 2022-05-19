import React, { useState } from 'react';
import { View, Text, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { OutlinedTextField } from 'react-native-material-textfield';
import { createStyles } from './styles';
import WarningExistingUserModal from '../WarningExistingUserModal';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import { tlc } from '../../../util/general';
import { DELETE_WALLET_INPUT_BOX_ID } from '../../../constants/test-ids';

interface IDeleteWalletConfirmationModalProps {
  modalVisible: boolean;
  cancelButtonDisabled: boolean;
  showDeleteWarning: boolean;
  onCancelPress: () => null;
  onRequestClose: () => null;
  onConfirmPress: () => null;
  submitDeleteWallet: () => null;
}

const DELETE = 'delete';

const DeleteWalletConfirmationModal = ({
  modalVisible,
  showDeleteWarning,
  onCancelPress,
  onRequestClose,
  onConfirmPress,
  submitDeleteWallet,
}: IDeleteWalletConfirmationModalProps) => {
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  const [deleteText, setDeleteText] = useState<string>('');
  const [disableButton, setDisableButton] = useState<boolean>(false);

  const isTextDelete = (text: string) => tlc(text) === DELETE;

  const checkDelete = (text: string) => {
    setDeleteText(text);
    setDisableButton(!isTextDelete(text));
  };

  return (
    <WarningExistingUserModal
      warningModalVisible={modalVisible}
      cancelText={strings('login.delete_my')}
      cancelButtonDisabled={disableButton}
      onCancelPress={onCancelPress}
      onRequestClose={onRequestClose}
      onConfirmPress={onConfirmPress}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.areYouSure}>
          <Text style={[styles.heading, styles.delete]}>
            {strings('login.type_delete', { [DELETE]: DELETE })}
          </Text>
          <OutlinedTextField
            style={styles.input}
            testID={DELETE_WALLET_INPUT_BOX_ID}
            autoFocus
            returnKeyType={'done'}
            onChangeText={checkDelete}
            autoCapitalize="none"
            value={deleteText}
            baseColor={colors.border.default}
            tintColor={colors.primary.default}
            placeholderTextColor={colors.text.muted}
            onSubmitEditing={submitDeleteWallet}
            keyboardAppearance={themeAppearance}
          />
          {showDeleteWarning && (
            <Text style={styles.deleteWarningMsg}>
              {strings('login.cant_proceed')}
            </Text>
          )}
        </View>
      </TouchableWithoutFeedback>
    </WarningExistingUserModal>
  );
};

export default React.memo(DeleteWalletConfirmationModal);
