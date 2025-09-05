import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView,
} from 'react-native';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import {
  OutlinedTextField,
  TextFieldProps,
} from 'react-native-material-textfield';
import { createStyles } from './styles';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import WarningExistingUserModal from '../WarningExistingUserModal';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import { doesPasswordMatch } from '../../../util/password';
import { setAllowLoginWithRememberMe } from '../../../actions/security';
import { useDispatch } from 'react-redux';
import { Authentication } from '../../../core';

const TurnOffRememberMeModal = () => {
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);
  const dispatch = useDispatch();

  const modalRef = useRef<ReusableModalRef>(null);

  const [passwordText, setPasswordText] = useState<string>('');
  const [disableButton, setDisableButton] = useState<boolean>(true);

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

  const triggerClose = () => dismissModal();

  const turnOffRememberMeAndLockApp = useCallback(async () => {
    dispatch(setAllowLoginWithRememberMe(false));
    Authentication.lockApp();
  }, [dispatch]);

  const disableRememberMe = useCallback(async () => {
    dismissModal(async () => await turnOffRememberMeAndLockApp());
  }, [turnOffRememberMeAndLockApp]);

  return (
    <ReusableModal ref={modalRef}>
      <SafeAreaView style={styles.container}>
        <WarningExistingUserModal
          warningModalVisible
          cancelText={strings('turn_off_remember_me.action')}
          cancelButtonDisabled={disableButton}
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
              <OutlinedTextField
                style={styles.input as TextFieldProps}
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
              />
            </View>
          </TouchableWithoutFeedback>
        </WarningExistingUserModal>
      </SafeAreaView>
    </ReusableModal>
  );
};

export default React.memo(TurnOffRememberMeModal);
