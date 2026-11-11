import React, { useCallback, useRef, useState } from 'react';
import { Modal } from 'react-native';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  TextField,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

export const PASSWORD_PROMPT_INPUT_TEST_ID =
  'mfa-recovery-dev-password-prompt-input';
export const PASSWORD_PROMPT_CONFIRM_TEST_ID =
  'mfa-recovery-dev-password-prompt-confirm';

interface PasswordPromptBottomSheetProps {
  testID: string;
  titleKey: string;
  /** Called with the entered password; the caller unmounts the sheet. */
  onSubmit: (password: string) => void;
  onClose: () => void;
}

/**
 * Prompts for a password. The value lives only in this component's state and
 * is never logged or stored.
 */
const PasswordPromptBottomSheet = ({
  testID,
  titleKey,
  onSubmit,
  onClose,
}: PasswordPromptBottomSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [password, setPassword] = useState('');

  const handleRequestClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirm = useCallback(() => {
    onSubmit(password);
  }, [onSubmit, password]);

  return (
    <Modal
      visible
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={handleRequestClose}
    >
      <BottomSheet
        ref={sheetRef}
        keyboardAvoidingViewEnabled={false}
        onClose={onClose}
        testID={testID}
      >
        <BottomSheetHeader onClose={handleRequestClose}>
          {strings(titleKey)}
        </BottomSheetHeader>
        <Box twClassName="flex flex-col gap-2 px-4 pb-4">
          <TextField
            value={password}
            onChangeText={setPassword}
            placeholder={strings(
              'app_settings.developer_options.mfa_recovery.password_prompt_placeholder',
            )}
            inputProps={{
              secureTextEntry: true,
              autoCapitalize: 'none',
              autoCorrect: false,
              testID: PASSWORD_PROMPT_INPUT_TEST_ID,
            }}
          />
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={password.length === 0}
            onPress={handleConfirm}
            testID={PASSWORD_PROMPT_CONFIRM_TEST_ID}
          >
            {strings(
              'app_settings.developer_options.mfa_recovery.password_prompt_confirm',
            )}
          </Button>
        </Box>
      </BottomSheet>
    </Modal>
  );
};

export default PasswordPromptBottomSheet;
