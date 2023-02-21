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
import { OutlinedTextField } from 'react-native-material-textfield';
import { createStyles } from './styles';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import WarningExistingUserModal from '../WarningExistingUserModal';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../..//util/navigation/navUtils';
import { doesPasswordMatch } from '../../../util/password';
import Engine from '../../../core/Engine';
import { logOut } from '../../../actions/user';
import { setAllowLoginWithRememberMe } from '../../../actions/security';
import { useDispatch } from 'react-redux';
import SecureKeychain from '../../../core/SecureKeychain';
import { TURN_OFF_REMEMBER_ME_MODAL } from '../../../constants/test-ids';
import { useNavigation } from '@react-navigation/native';

export const createTurnOffRememberMeModalNavDetails = createNavigationDetails(
  Routes.MODAL.ROOT_MODAL_FLOW,
  Routes.MODAL.TURN_OFF_REMEMBER_ME,
);

const TurnOffRememberMeModal = () => {
  const { colors, themeAppearance } = useTheme();
  const { navigate } = useNavigation();
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
    async (text) => setDisableButton(!(await isValidPassword(text))),
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
    const { KeyringController } = Engine.context as any;
    await SecureKeychain.resetGenericPassword();
    await KeyringController.setLocked();
    dispatch(setAllowLoginWithRememberMe(false));
    navigate(Routes.ONBOARDING.LOGIN);
    dispatch(logOut());
  }, [dispatch, navigate]);

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
                style={styles.input}
                testID={TURN_OFF_REMEMBER_ME_MODAL}
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
