import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';

export const EmailOtpStubSelectorsIDs = {
  BACK_BUTTON: 'email-otp-stub-back-button',
  CONTAINER: 'email-otp-stub-container',
  EMAIL_INPUT: 'email-otp-stub-input',
  CONTINUE_BUTTON: 'email-otp-stub-continue-button',
} as const;

interface EmailOtpStubProps {
  onBack: () => void;
  onSuccess: (email: string) => void | Promise<void>;
}

const EmailOtpStub = ({ onBack, onSuccess }: EmailOtpStubProps) => {
  const tw = useTailwind();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trimmedEmail = email.trim();

  const handleSubmit = useCallback(async () => {
    if (!trimmedEmail || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSuccess(trimmedEmail);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, onSuccess, trimmedEmail]);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        onBack={onBack}
        backButtonProps={{ testID: EmailOtpStubSelectorsIDs.BACK_BUTTON }}
        includesTopInset
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw.style('flex-1')}
      >
        <Box
          paddingHorizontal={4}
          twClassName="flex-1"
          testID={EmailOtpStubSelectorsIDs.CONTAINER}
        >
          <Box marginTop={2} gap={2}>
            <Text variant={TextVariant.HeadingLg}>
              {strings('virtual_bank_account.kyc_email.title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('virtual_bank_account.kyc_email.description')}
            </Text>
          </Box>
          <Box marginTop={6}>
            <TextField
              value={email}
              onChangeText={setEmail}
              placeholder={strings(
                'virtual_bank_account.kyc_email.input_placeholder',
              )}
              autoFocus
              inputProps={{
                testID: EmailOtpStubSelectorsIDs.EMAIL_INPUT,
                autoCapitalize: 'none',
                autoComplete: 'email',
                keyboardType: 'email-address',
                returnKeyType: 'done',
                onSubmitEditing: handleSubmit,
              }}
            />
          </Box>
        </Box>
        <Box padding={4}>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isLoading={isSubmitting}
            isDisabled={!trimmedEmail || isSubmitting}
            onPress={handleSubmit}
            testID={EmailOtpStubSelectorsIDs.CONTINUE_BUTTON}
          >
            {strings('virtual_bank_account.kyc_email.button')}
          </Button>
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EmailOtpStub;
