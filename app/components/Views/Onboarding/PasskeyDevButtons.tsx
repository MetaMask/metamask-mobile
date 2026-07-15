import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { Theme, ThemeProvider } from '@metamask/design-system-twrnc-preset';
import Device from '../../../util/device';
import {
  createDevPasskey,
  PASSKEY_RP_ID,
  verifyDevPasskey,
} from '../../../core/Passkey/passkeyDevTest';
import { OnboardingSelectorIDs } from './Onboarding.testIds';

const formatPasskeyError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  // react-native-passkey rejects with a plain object: { error, message }
  if (error && typeof error === 'object') {
    const { error: code, message } = error as {
      error?: string;
      message?: string;
    };
    if (message || code) {
      return [code, message].filter(Boolean).join(': ');
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
};

const PasskeyDevButtons = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const onPressCreatePasskey = useCallback(async () => {
    setIsCreating(true);
    try {
      const result = await createDevPasskey();
      Alert.alert(
        'Passkey created',
        `Credential registered for rpId "${PASSKEY_RP_ID}".\n\nCredential ID: ${result.id}`,
      );
    } catch (error) {
      Alert.alert('Create Passkey failed', formatPasskeyError(error));
    } finally {
      setIsCreating(false);
    }
  }, []);

  const onPressVerifyPasskey = useCallback(async () => {
    setIsVerifying(true);
    try {
      const result = await verifyDevPasskey();
      Alert.alert(
        'Passkey verified',
        `Assertion succeeded for rpId "${PASSKEY_RP_ID}".\n\nCredential ID: ${result.id}`,
      );
    } catch (error) {
      Alert.alert('Verify Passkey failed', formatPasskeyError(error));
    } finally {
      setIsVerifying(false);
    }
  }, []);

  if (!__DEV__) {
    return null;
  }

  const buttonSize = Device.isMediumDevice() ? ButtonSize.Md : ButtonSize.Lg;

  return (
    <>
      <ThemeProvider theme={Theme.Dark}>
        <Button
          variant={ButtonVariant.Primary}
          onPress={onPressCreatePasskey}
          testID={OnboardingSelectorIDs.CREATE_PASSKEY_BUTTON}
          isFullWidth
          size={buttonSize}
          isDisabled={isCreating || isVerifying}
          isLoading={isCreating}
        >
          Create Passkey
        </Button>
      </ThemeProvider>
      <ThemeProvider theme={Theme.Light}>
        <Button
          variant={ButtonVariant.Primary}
          onPress={onPressVerifyPasskey}
          testID={OnboardingSelectorIDs.VERIFY_PASSKEY_BUTTON}
          isFullWidth
          size={buttonSize}
          isDisabled={isCreating || isVerifying}
          isLoading={isVerifying}
        >
          Verify Passkey
        </Button>
      </ThemeProvider>
    </>
  );
};

export default PasskeyDevButtons;
