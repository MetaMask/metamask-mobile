import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Passkey,
  type PasskeyCreateRequest,
  type PasskeyCreateResult,
  type PasskeyGetRequest,
  type PasskeyGetResult,
} from 'react-native-passkey';
import { fromByteArray } from 'react-native-quick-base64';
import QuickCrypto from 'react-native-quick-crypto';
import AppConstants from '../AppConstants';
import { toBase64UrlSafe } from '../OAuthService/OAuthLoginHandlers/utils';

const PASSKEY_DEV_CREDENTIAL_ID_KEY = 'passkey_dev_test_credential_id';
const PASSKEY_DEV_USER_ID_KEY = 'passkey_dev_test_user_id';

export const PASSKEY_RP_ID = AppConstants.MM_IO_UNIVERSAL_LINK_HOST;
export const PASSKEY_RP_NAME = 'MetaMask';

function randomBase64Url(byteLength: number): string {
  const bytes = QuickCrypto.getRandomValues(new Uint8Array(byteLength));
  return toBase64UrlSafe(fromByteArray(bytes));
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
