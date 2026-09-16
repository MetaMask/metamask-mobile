import React from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxFlexDirection,
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
import { strings } from '../../../../../../locales/i18n';
import { useKycEmailVerification } from './hooks/useKycEmailVerification';

export const KycEmailSelectorsIDs = {
  CONTAINER: 'vba-kyc-email-container',
  BACK_BUTTON: 'vba-kyc-email-back-button',
  EMAIL_INPUT: 'vba-kyc-email-input',
  CONTINUE_BUTTON: 'vba-kyc-email-continue-button',
} as const;

const KycEmail = () => {
  const tw = useTailwind();
  const {
    email,
    setEmail,
    isVerifying,
    isContinueDisabled,
    goBack,
    startVerification,
  } = useKycEmailVerification();

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        onBack={goBack}
        backButtonProps={{ testID: KycEmailSelectorsIDs.BACK_BUTTON }}
        includesTopInset
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw.style('flex-1')}
      >
        <Box
          flexDirection={BoxFlexDirection.Column}
          paddingHorizontal={4}
          twClassName="flex-1"
          testID={KycEmailSelectorsIDs.CONTAINER}
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
                testID: KycEmailSelectorsIDs.EMAIL_INPUT,
                autoCapitalize: 'none',
                autoComplete: 'email',
                keyboardType: 'email-address',
                returnKeyType: 'done',
                onSubmitEditing: startVerification,
              }}
            />
          </Box>
        </Box>
        <Box padding={4}>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isLoading={isVerifying}
            isDisabled={isContinueDisabled}
            onPress={startVerification}
            testID={KycEmailSelectorsIDs.CONTINUE_BUTTON}
          >
            {strings('virtual_bank_account.kyc_email.button')}
          </Button>
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default KycEmail;
