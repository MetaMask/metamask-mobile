import React, { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { MOCK_KYC_PREFILLED_EMAIL } from './constants';
import { startIronKycVerification } from './ironKycFlow';
import MockKycProgressBar from './MockKycProgressBar';
import { MockKycEmailSelectorsIDs } from './MockKycEmail.testIds';

/**
 * Demo-only email step for the Iron/Sumsub KYC flow: the screen chrome is still
 * placeholder copy, but Continue drives the real Iron customer creation,
 * consents, and native Sumsub hand-off.
 */
const MockKycEmail = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const [email, setEmail] = useState(MOCK_KYC_PREFILLED_EMAIL);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleContinue = useCallback(async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || isVerifying) {
      return;
    }

    setIsVerifying(true);
    try {
      await startIronKycVerification(trimmedEmail);
      navigation.navigate(Routes.RAMP.VBA_MOCK_KYC_SUCCESS);
    } catch (error) {
      Alert.alert(
        strings('virtual_bank_account.kyc_error.title'),
        error instanceof Error
          ? error.message
          : strings('virtual_bank_account.kyc_error.verification_failed'),
      );
    } finally {
      setIsVerifying(false);
    }
  }, [email, isVerifying, navigation]);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        title={strings('virtual_bank_account.mock_kyc.email.navbar_title')}
        onBack={handleBack}
        backButtonProps={{ testID: MockKycEmailSelectorsIDs.BACK_BUTTON }}
        includesTopInset
      />
      <MockKycProgressBar filledCount={1} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw.style('flex-1')}
      >
        <Box
          flexDirection={BoxFlexDirection.Column}
          twClassName="flex-1 px-4"
          testID={MockKycEmailSelectorsIDs.CONTAINER}
        >
          <Text variant={TextVariant.HeadingLg} twClassName="mt-2">
            {strings('virtual_bank_account.mock_kyc.email.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-2"
          >
            {strings('virtual_bank_account.mock_kyc.email.description')}
          </Text>
          <TextField
            twClassName="mt-6"
            value={email}
            onChangeText={setEmail}
            placeholder={strings(
              'virtual_bank_account.mock_kyc.email.input_placeholder',
            )}
            autoFocus
            inputProps={{
              testID: MockKycEmailSelectorsIDs.EMAIL_INPUT,
              autoCapitalize: 'none',
              autoComplete: 'email',
              keyboardType: 'email-address',
              returnKeyType: 'done',
              onSubmitEditing: handleContinue,
            }}
          />
        </Box>
        <Box twClassName="p-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isLoading={isVerifying}
            isDisabled={isVerifying}
            onPress={handleContinue}
            testID={MockKycEmailSelectorsIDs.CONTINUE_BUTTON}
          >
            {strings('virtual_bank_account.mock_kyc.email.button')}
          </Button>
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default MockKycEmail;
