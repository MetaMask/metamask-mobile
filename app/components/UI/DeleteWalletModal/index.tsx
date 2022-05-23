import React, { useState, useRef } from 'react';
import { View, Text, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { OutlinedTextField } from 'react-native-material-textfield';
import { createStyles } from './styles';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import WarningExistingUserModal from '../WarningExistingUserModal';
import useDeleteWallet from '../../hooks/useDeleteWallet';
import { strings } from '../../../../locales/i18n';
import {
  DELETE_WALLET_CONTAINER_ID,
  DELETE_WALLET_INPUT_BOX_ID,
} from '../../../constants/test-ids';
import { useTheme } from '../../../util/theme';
import { tlc } from '../../../util/general';
import Routes from '../../../constants/navigation/Routes';

const DELETE_KEYWORD = 'delete';

const DeleteWalletModal = () => {
  const navigation = useNavigation();
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  const modalRef = useRef<ReusableModalRef>(null);

  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [deleteText, setDeleteText] = useState<string>('');
  const [disableButton, setDisableButton] = useState<boolean>(true);
  const [showDeleteWarning] = useState<boolean>(false);

  const [resetWalletState, deleteUser] = useDeleteWallet();

  const isTextDelete = (text: string) => tlc(text) === DELETE_KEYWORD;

  const checkDelete = (text: string) => {
    setDeleteText(text);
    setDisableButton(!isTextDelete(text));
  };

  const dismissModal = (cb?: () => void): void =>
    modalRef?.current?.dismissModal(cb);

  const triggerClose = (): void => dismissModal();

  const navigateOnboardingRoot = (): void => {
    navigation.reset({
      routes: [
        {
          name: Routes.ONBOARDING.ROOT_NAV,
          state: {
            routes: [
              {
                name: 'OnboardingNav',
                params: {
                  screen: Routes.ONBOARDING.ONBOARDING,
                  params: { delete: true },
                },
              },
            ],
          },
        },
      ],
    });
  };

  const deleteWallet = async () => {
    await resetWalletState();
    await deleteUser();
    triggerClose();
    navigateOnboardingRoot();
  };

  return (
    <ReusableModal ref={modalRef}>
      {showConfirm ? (
        <WarningExistingUserModal
          warningModalVisible
          cancelText={strings('login.delete_my')}
          cancelButtonDisabled={disableButton}
          onCancelPress={deleteWallet}
          onRequestClose={() => null}
          onConfirmPress={triggerClose}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.areYouSure}>
              <Text style={[styles.heading, styles.delete]}>
                {strings('login.type_delete', {
                  [DELETE_KEYWORD]: DELETE_KEYWORD,
                })}
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
                onSubmitEditing={() => null}
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
      ) : (
        <WarningExistingUserModal
          warningModalVisible
          cancelText={strings('login.i_understand')}
          onCancelPress={() => setShowConfirm(true)}
          onRequestClose={() => null}
          onConfirmPress={triggerClose}
        >
          <View style={styles.areYouSure} testID={DELETE_WALLET_CONTAINER_ID}>
            <Icon
              style={styles.warningIcon}
              size={46}
              color={colors.error.default}
              name="exclamation-triangle"
            />
            <Text style={[styles.heading, styles.red]}>
              {strings('login.are_you_sure')}
            </Text>
            <Text style={styles.warningText}>
              <Text>{strings('login.your_current_wallet')}</Text>
              <Text style={styles.bold}>{strings('login.removed_from')}</Text>
              <Text>{strings('login.this_action')}</Text>
            </Text>
            <Text style={[styles.warningText]}>
              <Text>{strings('login.you_can_only')}</Text>
              <Text style={styles.bold}>
                {strings('login.recovery_phrase')}
              </Text>
              <Text>{strings('login.metamask_does_not')}</Text>
            </Text>
          </View>
        </WarningExistingUserModal>
      )}
    </ReusableModal>
  );
};

export default React.memo(DeleteWalletModal);
