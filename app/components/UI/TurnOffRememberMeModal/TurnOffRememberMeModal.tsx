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
import { setAllowLoginWithRememberMe } from '../../../actions/security';
import { useDispatch } from 'react-redux';
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
  const dispatch = useDispatch();

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
      // Get the previous auth type that was stored before enabling remember me
      const previousAuthType = await StorageWrapper.getItem(
        PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME,
      );

      // Determine which auth method to restore
      // Use stored previous auth type if available, otherwise fall back to password
      const authTypeToRestore = previousAuthType
        ? (previousAuthType as AUTHENTICATION_TYPE)
        : AUTHENTICATION_TYPE.PASSWORD;

      // Use the password entered in the modal to restore auth method
      await Authentication.updateAuthPreference({
        authType: authTypeToRestore,
        password: passwordText,
      });
      // Clear the stored previous auth type after successful restoration
      await StorageWrapper.removeItem(PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME);
      // Only set Redux state after operation completes successfully
      dispatch(setAllowLoginWithRememberMe(false));

      dismissModal();
    } catch (error) {
      // If update fails, still disable remember me and lock app
      // The user will need to re-enable their preferred auth method
      dispatch(setAllowLoginWithRememberMe(false));
      Logger.error(
        error as Error,
        'Failed to restore auth preference when disabling remember me',
      );

      // Dismiss modal even on error
      dismissModal();
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, passwordText]);

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
