import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { OutlinedTextField } from 'react-native-material-textfield';
import { createStyles } from './styles';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import WarningExistingUserModal from '../WarningExistingUserModal';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import { doesPasswordMatch } from '../../../util/password';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import Logger from '../../../util/Logger';
import StorageWrapper from '../../../store/storage-wrapper';
import { PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME } from '../../../constants/storage';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';

export const createTurnOffRememberMeModalNavDetails = createNavigationDetails(
  Routes.MODAL.ROOT_MODAL_FLOW,
  Routes.MODAL.TURN_OFF_REMEMBER_ME,
);

const TurnOffRememberMeModal = () => {
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  const modalRef = useRef<ReusableModalRef>(null);

  const [passwordText, setPasswordText] = useState<string>('');
  const [disableButton, setDisableButton] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isValidPassword = useCallback(
    async (text: string): Promise<boolean> => {
      const response = await doesPasswordMatch(text);
      return response.valid;
    },
    [],
  );

  const debouncedIsValidPassword = useCallback(
    async (text: string) => setDisableButton(!(await isValidPassword(text))),
    [isValidPassword],
  );

  const checkPassword = useCallback(
    async (text: string) => {
      setPasswordText(text);
      debouncedIsValidPassword(text);
    },
    [debouncedIsValidPassword],
  );

  const dismissModal = (cb?: () => void): void =>
    modalRef?.current?.dismissModal(cb);

  const triggerClose = () => {
    if (!isLoading) {
      dismissModal();
    }
  };

  const turnOffRememberMeAndLockApp = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use the password entered in the modal to restore auth method
      await Authentication.updateAuthPreference({
        authType: AUTHENTICATION_TYPE.PASSWORD,
        password: passwordText,
      });
      // Clear the stored previous auth type after successful restoration
      await StorageWrapper.removeItem(PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME);

      dismissModal();
    } catch (error) {
      Logger.error(
        error as Error,
        'Failed to restore auth preference when disabling remember me',
      );

      // Dismiss modal even on error
      dismissModal();
    } finally {
      setIsLoading(false);
    }
  }, [passwordText]);

  const disableRememberMe = useCallback(async () => {
    // Don't dismiss modal here - let turnOffRememberMeAndLockApp handle it
    await turnOffRememberMeAndLockApp();
  }, [turnOffRememberMeAndLockApp]);

  return (
    <ReusableModal ref={modalRef} isInteractable={!isLoading}>
      <SafeAreaView style={styles.container}>
        <WarningExistingUserModal
          warningModalVisible
          cancelText={strings('turn_off_remember_me.action')}
          cancelButtonDisabled={disableButton || isLoading}
          onCancelPress={disableRememberMe}
          onRequestClose={triggerClose}
          onConfirmPress={triggerClose}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.areYouSure}>
              <Text variant={TextVariant.HeadingLG} style={styles.textStyle}>
                {strings('turn_off_remember_me.title')}
              </Text>
              <Text variant={TextVariant.BodyMD} style={styles.textStyle}>
                {strings('turn_off_remember_me.description')}
              </Text>
              {isLoading ? (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="justify-center py-8"
                >
                  <ActivityIndicator
                    size="small"
                    color={colors.primary.default}
                  />
                </Box>
              ) : (
                <OutlinedTextField
                  style={styles.input}
                  secureTextEntry
                  returnKeyType={'done'}
                  onChangeText={checkPassword}
                  autoCapitalize="none"
                  value={passwordText}
                  placeholder={strings('turn_off_remember_me.placeholder')}
                  baseColor={colors.border.default}
                  tintColor={colors.primary.default}
                  placeholderTextColor={colors.text.muted}
                  keyboardAppearance={themeAppearance}
                  editable={!isLoading}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </WarningExistingUserModal>
      </SafeAreaView>
    </ReusableModal>
  );
};

export default React.memo(TurnOffRememberMeModal);
