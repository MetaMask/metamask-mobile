import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
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
import MockKycProgressBar from './MockKycProgressBar';
import { MockKycEmailSelectorsIDs } from './MockKycEmail.testIds';

/**
 * Demo-only placeholder for the real Iron/Sumsub KYC email step.
 */
const MockKycEmail = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const [email, setEmail] = useState(MOCK_KYC_PREFILLED_EMAIL);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleContinue = useCallback(() => {
    navigation.navigate(Routes.RAMP.VBA_MOCK_KYC_SUCCESS);
  }, [navigation]);

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
