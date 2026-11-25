import { InteractionManager, Platform } from 'react-native';
import { authenticateAsync } from 'expo-local-authentication';
import { getMfaErrorCode } from '@metamask/profile-sync-controller/sdk';
import { strings } from '../../../../locales/i18n';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import type { AuthData } from '../../../core/Authentication/Authentication';
import Logger from '../../../util/Logger';

const ANDROID_BIOMETRICS_UNAVAILABLE_ERRORS = new Set([
  'not_enrolled',
  'not_available',
  'passcode_not_set',
  'hardware_unavailable',
]);

export interface PromptPostMfaDeviceBiometricsDeps {
  componentAuthenticationType: (
    biometryChoice: boolean,
    rememberMe: boolean,
  ) => Promise<AuthData>;
  requestBiometricsAccessControlForIOS: (
    type: AUTHENTICATION_TYPE,
  ) => Promise<AUTHENTICATION_TYPE>;
}

interface PromptOutcome {
  authType: AUTHENTICATION_TYPE;
  biometricsWereOffered: boolean;
  biometricsRejected: boolean;
}

/**
 * Wait for the MFA sheet to dismiss before showing device biometrics.
 * Passkey needs a longer gap so the two OS sheets do not collide.
 */
async function waitForMfaSheetDismiss(
  verifiedViaPasskey: boolean,
): Promise<void> {
  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(resolve, verifiedViaPasskey ? 1000 : 400);
    });
  });
}

function deviceOffersBiometrics(authPreference: AuthData): boolean {
  const type = authPreference.currentAuthType;
  return (
    Boolean(authPreference.availableBiometryType) ||
    type === AUTHENTICATION_TYPE.BIOMETRIC ||
    type === AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION
  );
}

async function promptIosBiometrics(
  typeBeforePrompt: AUTHENTICATION_TYPE,
  requestBiometricsAccessControlForIOS: PromptPostMfaDeviceBiometricsDeps['requestBiometricsAccessControlForIOS'],
): Promise<AUTHENTICATION_TYPE> {
  const typeToPrompt =
    typeBeforePrompt === AUTHENTICATION_TYPE.BIOMETRIC ||
    typeBeforePrompt === AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION
      ? typeBeforePrompt
      : AUTHENTICATION_TYPE.BIOMETRIC;
  return requestBiometricsAccessControlForIOS(typeToPrompt);
}

async function promptAndroidBiometrics(
  typeBeforePrompt: AUTHENTICATION_TYPE,
): Promise<{
  afterPrompt: AUTHENTICATION_TYPE;
  biometricsWereOffered: boolean;
}> {
  const promptResult = await authenticateAsync({
    promptMessage: strings('authentication.auth_prompt_desc'),
    cancelLabel: strings('navigation.cancel'),
    disableDeviceFallback: true,
  });

  if (promptResult.success) {
    return {
      afterPrompt: AUTHENTICATION_TYPE.BIOMETRIC,
      biometricsWereOffered: true,
    };
  }

  const promptError = 'error' in promptResult ? String(promptResult.error) : '';
  if (ANDROID_BIOMETRICS_UNAVAILABLE_ERRORS.has(promptError)) {
    return {
      afterPrompt: typeBeforePrompt,
      biometricsWereOffered: false,
    };
  }

  return {
    afterPrompt: AUTHENTICATION_TYPE.PASSWORD,
    biometricsWereOffered: true,
  };
}

async function runDeviceBiometricsPrompt(
  typeBeforePrompt: AUTHENTICATION_TYPE,
  verifiedViaPasskey: boolean,
  requestBiometricsAccessControlForIOS: PromptPostMfaDeviceBiometricsDeps['requestBiometricsAccessControlForIOS'],
): Promise<PromptOutcome> {
  await waitForMfaSheetDismiss(verifiedViaPasskey);

  try {
    if (Platform.OS === 'ios') {
      const afterPrompt = await promptIosBiometrics(
        typeBeforePrompt,
        requestBiometricsAccessControlForIOS,
      );
      return {
        authType: afterPrompt,
        biometricsWereOffered: true,
        biometricsRejected: afterPrompt === AUTHENTICATION_TYPE.PASSWORD,
      };
    }

    const androidResult = await promptAndroidBiometrics(typeBeforePrompt);
    return {
      authType: androidResult.afterPrompt,
      biometricsWereOffered: androidResult.biometricsWereOffered,
      biometricsRejected:
        androidResult.biometricsWereOffered &&
        androidResult.afterPrompt === AUTHENTICATION_TYPE.PASSWORD,
    };
  } catch {
    return {
      authType: typeBeforePrompt,
      biometricsWereOffered: false,
      biometricsRejected: false,
    };
  }
}

/**
 * After locked MFA verify, optionally prompt for device unlock biometrics and
 * return the auth preference for the following password unlock.
 */
export async function promptPostMfaDeviceBiometrics(
  deps: PromptPostMfaDeviceBiometricsDeps,
  verifiedViaPasskey: boolean,
): Promise<AuthData> {
  let authPreference: AuthData = {
    currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
    oauth2Login: true,
  };

  try {
    authPreference = await deps.componentAuthenticationType(true, false);
    authPreference.oauth2Login = true;

    const typeBeforePrompt = authPreference.currentAuthType;
    const offersBiometrics = deviceOffersBiometrics(authPreference);
    let outcome: PromptOutcome = {
      authType: typeBeforePrompt,
      biometricsWereOffered: false,
      biometricsRejected: false,
    };

    if (offersBiometrics) {
      outcome = await runDeviceBiometricsPrompt(
        typeBeforePrompt,
        verifiedViaPasskey,
        deps.requestBiometricsAccessControlForIOS,
      );
    }

    const authType = outcome.biometricsRejected
      ? AUTHENTICATION_TYPE.PASSWORD
      : outcome.authType;
    authPreference.currentAuthType = authType;

    Logger.log('OAuthRehydration: post-MFA biometrics', {
      platform: Platform.OS,
      verifiedViaPasskey,
      availableBiometryType: authPreference.availableBiometryType,
      deviceOffersBiometrics: offersBiometrics,
      biometricsWereOffered: outcome.biometricsWereOffered,
      biometricsRejected: outcome.biometricsRejected,
      typeBeforePrompt,
      authType,
    });

    return authPreference;
  } catch (biometricError) {
    Logger.log('OAuthRehydration: post-MFA biometrics failed', {
      code: getMfaErrorCode(biometricError),
    });
    return {
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
      oauth2Login: true,
      availableBiometryType: authPreference.availableBiometryType,
    };
  }
}
