import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  Passkey,
  type PasskeyCreateRequest,
  type PasskeyCreateResult,
  type PasskeyGetRequest,
  type PasskeyGetResult,
} from 'react-native-passkey';
import AppConstants from '../AppConstants';
import { toBase64UrlSafe } from '../OAuthService/OAuthLoginHandlers/utils';

const PASSKEY_DEV_CREDENTIAL_ID_KEY = 'passkey_dev_test_credential_id';
const PASSKEY_DEV_USER_ID_KEY = 'passkey_dev_test_user_id';

// The relying party (rpId) must publish a Digital Asset Links / AASA file that
// associates this build with the domain. iOS validates `link.metamask.io` via
// `webcredentials` (Team+Bundle match), but Android's Credential Manager also
// requires a `delegate_permission/common.get_login_creds` entry, which the
// production domain does not publish. For dev testing we therefore allow the
// rpId to be overridden per-platform via env (e.g. a GitHub Pages domain whose
// assetlinks.json we control).
export const PASSKEY_RP_ID =
  (Platform.OS === 'android'
    ? process.env.PASSKEY_RP_ID_ANDROID
    : process.env.PASSKEY_RP_ID_IOS
  )?.trim() || AppConstants.MM_IO_UNIVERSAL_LINK_HOST;
export const PASSKEY_RP_NAME = 'MetaMask';

function randomBase64Url(byteLength: number): string {
  // `crypto.getRandomValues` and `Buffer` are polyfilled globally in `shim.js`
  // (react-native-get-random-values + @craftzdog/react-native-buffer), so we
  // avoid pulling in native crypto modules that may not be initialized this
  // early in the onboarding flow.
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toBase64UrlSafe(Buffer.from(bytes).toString('base64'));
}

async function getOrCreateDevUserId(): Promise<string> {
  const existingUserId = await AsyncStorage.getItem(PASSKEY_DEV_USER_ID_KEY);
  if (existingUserId) {
    return existingUserId;
  }

  const userId = randomBase64Url(16);
  await AsyncStorage.setItem(PASSKEY_DEV_USER_ID_KEY, userId);
  return userId;
}

export function buildPasskeyCreateRequest(
  userId: string,
): PasskeyCreateRequest {
  return {
    challenge: randomBase64Url(32),
    rp: {
      id: PASSKEY_RP_ID,
      name: PASSKEY_RP_NAME,
    },
    user: {
      id: userId,
      name: 'metamask-dev-tester',
      displayName: 'MetaMask Dev Tester',
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    timeout: 60_000,
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'required',
      userVerification: 'preferred',
    },
    attestation: 'none',
  };
}

export async function buildPasskeyGetRequest(): Promise<PasskeyGetRequest> {
  const storedCredentialId = await AsyncStorage.getItem(
    PASSKEY_DEV_CREDENTIAL_ID_KEY,
  );

  return {
    challenge: randomBase64Url(32),
    rpId: PASSKEY_RP_ID,
    timeout: 60_000,
    userVerification: 'preferred',
    ...(storedCredentialId
      ? {
          allowCredentials: [
            {
              type: 'public-key' as const,
              id: storedCredentialId,
            },
          ],
        }
      : {}),
  };
}

export async function createDevPasskey(): Promise<PasskeyCreateResult> {
  if (!Passkey.isSupported()) {
    throw new Error('Passkeys are not supported on this device.');
  }

  const userId = await getOrCreateDevUserId();
  const result = await Passkey.createPlatformKey(
    buildPasskeyCreateRequest(userId),
  );

  await AsyncStorage.setItem(PASSKEY_DEV_CREDENTIAL_ID_KEY, result.id);
  return result;
}

export async function verifyDevPasskey(): Promise<PasskeyGetResult> {
  if (!Passkey.isSupported()) {
    throw new Error('Passkeys are not supported on this device.');
  }

  const request = await buildPasskeyGetRequest();
  return Passkey.getPlatformKey(request);
}

export async function clearDevPasskeyState(): Promise<void> {
  await AsyncStorage.multiRemove([
    PASSKEY_DEV_CREDENTIAL_ID_KEY,
    PASSKEY_DEV_USER_ID_KEY,
  ]);
}
