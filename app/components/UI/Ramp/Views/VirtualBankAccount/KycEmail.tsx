import React from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useSelector } from 'react-redux';
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
import type { RootState } from '../../../../../reducers';
import { useKycEmailVerification } from './hooks/useKycEmailVerification';
import type { VbaEmailCompletion } from './modules/types';

export const KycEmailSelectorsIDs = {
  CONTAINER: 'vba-kyc-email-container',
  BACK_BUTTON: 'vba-kyc-email-back-button',
  EMAIL_INPUT: 'vba-kyc-email-input',
  CONTINUE_BUTTON: 'vba-kyc-email-continue-button',
  RESET_BUTTON: 'vba-kyc-email-reset-button',
  CONTROLLER_STATE: 'vba-kyc-email-controller-state',
} as const;

const formatKycStateValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
};

interface KycEmailProps {
  onSuccess: (result: VbaEmailCompletion) => void | Promise<void>;
}

const KycEmail = ({ onSuccess }: KycEmailProps) => {
  const tw = useTailwind();
  const {
    email,
    setEmail,
    isVerifying,
    isContinueDisabled,
    goBack,
    startVerification,
    resetKyc,
  } = useKycEmailVerification(onSuccess);
  const kycControllerState = useSelector(
    (state: RootState) => state.engine.backgroundState.KycController,
  );
  const controllerEmail = kycControllerState?.email ?? null;
  const vendor = kycControllerState?.vendor ?? null;
  const geoCountry = kycControllerState?.geoCountry ?? null;
  const sessionStatus = kycControllerState?.sessionStatus ?? null;

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
          <Box
            marginTop={6}
            gap={1}
            testID={KycEmailSelectorsIDs.CONTROLLER_STATE}
          >
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              email: {formatKycStateValue(controllerEmail)}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              vendor: {formatKycStateValue(vendor)}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              geoCountry: {formatKycStateValue(geoCountry)}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              sessionStatus: {formatKycStateValue(sessionStatus)}
            </Text>
          </Box>
        </Box>
        <Box padding={4} gap={3}>
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
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={isVerifying}
            onPress={resetKyc}
            testID={KycEmailSelectorsIDs.RESET_BUTTON}
          >
            {strings('virtual_bank_account.kyc_email.reset_button')}
          </Button>
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default KycEmail;
