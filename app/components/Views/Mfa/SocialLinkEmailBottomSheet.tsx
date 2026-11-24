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
import { strings } from '../../../../locales/i18n';
import { MfaSettingsSelectorsIDs } from './Mfa.testIds';

interface SocialLinkEmailBottomSheetProps {
  /** Called with the trimmed email; the caller unmounts the sheet. */
  onSubmit: (email: string) => void;
  onClose: () => void;
}

/**
 * Asks for the email Auth links the social login with. Dev and QA builds
 * only: it replaces the social token's own email.
 */
const SocialLinkEmailBottomSheet = ({
  onSubmit,
  onClose,
}: SocialLinkEmailBottomSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [email, setEmail] = useState('');
  const trimmed = email.trim();

  const handleRequestClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirm = useCallback(() => {
    onSubmit(trimmed);
  }, [onSubmit, trimmed]);

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
        testID={MfaSettingsSelectorsIDs.SOCIAL_LINK_EMAIL_SHEET}
      >
        <BottomSheetHeader onClose={handleRequestClose}>
          {strings('mfa.settings.social_link_email_title')}
        </BottomSheetHeader>
        <Box twClassName="flex flex-col gap-2 px-4 pb-4">
          <TextField
            value={email}
            onChangeText={setEmail}
            placeholder={strings('mfa.settings.social_link_email_placeholder')}
            inputProps={{
              keyboardType: 'email-address',
              autoCapitalize: 'none',
              autoCorrect: false,
              testID: MfaSettingsSelectorsIDs.SOCIAL_LINK_EMAIL_INPUT,
            }}
          />
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={trimmed.length === 0}
            onPress={handleConfirm}
            testID={MfaSettingsSelectorsIDs.SOCIAL_LINK_EMAIL_CONFIRM}
          >
            {strings('mfa.settings.social_link_email_confirm')}
          </Button>
        </Box>
      </BottomSheet>
    </Modal>
  );
};

export default SocialLinkEmailBottomSheet;
