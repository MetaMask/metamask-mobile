import { useCallback, useState } from 'react';
import { NativeModules, Platform } from 'react-native';
import SNSMobileSDK from '@sumsub/react-native-mobilesdk-module';
import { x25519 } from '@noble/curves/ed25519';
import { gcm } from '@noble/ciphers/aes';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';
import { base64ToBytes } from '@metamask/utils';
import Engine from '../../../core/Engine';
import { getRandomBytes } from '../../../core/Encryptor/bytes';
import {
  getOrCreateLocalUserSecret,
  deriveClientMaterial,
  wrapUserKey,
  toBase64Url,
} from '../../../core/UKYC';

// eslint-disable-next-line import-x/no-restricted-paths
import { UKYC_API_BASE_URL } from '../MoonpayDemo/api';

async function getBearerToken(): Promise<string> {
  const bearerToken =
    await Engine.context.AuthenticationController.getBearerToken();
  if (!bearerToken) {
    throw new Error(
      'Unable to obtain an authentication bearer token — is the wallet signed in?',
    );
  }
  return bearerToken;
}

interface CreateSessionResponse {
  sessionId: string;
  idosSessionId: string;
}

async function createSession(
  jwtToken: string,
  moonPayAccessToken: string,
  moonPayUserId: string,
  wrappedEncryptionKey: WrappedEncryptionKey,
): Promise<CreateSessionResponse> {
  const bearerToken = await getBearerToken();
  const response = await fetch(`${UKYC_API_BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify({
      vendorId: 'moonpay',
      vendorUserId: 'mockedId',
      jwtToken,
      vendorMetadata: {
        moonPayAccessToken,
        moonPayUserId,
      },
      wrappedEncryptionKey,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`POST /sessions failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

interface GetWrappingKeyResponse {
  id: string;
  jwtChain: string;
  sessionServerPublicKey: {
    kty: string;
    crv: string;
    x: string;
  };
}

async function getWrappingKey(
  sessionClientPublicKey: string,
): Promise<GetWrappingKeyResponse> {
  const bearerToken = await getBearerToken();
  const response = await fetch(`${UKYC_API_BASE_URL}/wrapping-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify({ sessionClientPublicKey }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `POST /wrapping-key failed (${response.status}): ${errorBody}`,
    );
  }

  return response.json();
}

function base64UrlToBytes(value: string): Uint8Array {
  return base64ToBytes(
    value
      .replace(/-/gu, '+')
      .replace(/_/gu, '/')
      .padEnd(value.length + ((4 - (value.length % 4)) % 4), '='),
  );
}

interface WrappedEncryptionKey {
  sessionId: string;
  encryptedKey: string;
  nonce: string;
}

/**
 * Wraps (encrypts) `keyToWrap` for the UKYC session server. The AEAD key is the
 * ECDH shared secret between our session client private key and the session
 * server public key returned by `getWrappingKey`, run through HKDF-SHA256; the
 * key is then sealed with AES-256-GCM.
 *
 * @param sessionClientPrivateKey - Our session's X25519 private key.
 * @param sessionServerPublicKey - The server's X25519 public key (base64url).
 * @param keyToWrap - The raw symmetric key bytes to encrypt.
 * @returns The base64url `encryptedKey` (ciphertext + tag) and `nonce`.
 */
function wrapEncryptionKey(
  sessionClientPrivateKey: Uint8Array,
  sessionServerPublicKey: string,
  keyToWrap: Uint8Array,
): Pick<WrappedEncryptionKey, 'encryptedKey' | 'nonce'> {
  const serverPublicKey = base64UrlToBytes(sessionServerPublicKey);
  const shared = x25519.getSharedSecret(
    sessionClientPrivateKey,
    serverPublicKey,
  );
  const aeadKey = hkdf(sha256, shared, undefined, undefined, 32);
  const nonce = getRandomBytes(12);
  const encryptedKey = gcm(aeadKey, nonce).encrypt(keyToWrap);
  return {
    encryptedKey: toBase64Url(encryptedKey),
    nonce: toBase64Url(nonce),
  };
}

interface SubmitWrappedKeyResponse {
  status: string;
  applicantAccessToken: string;
}

// This might not be needed anymore, but for now we need to call it to get the sumsub applicant access token
async function fetchAccessToken(
  sessionId: string,
  idosSessionId: string,
): Promise<SubmitWrappedKeyResponse> {
  const bearerToken = await getBearerToken();
  const response = await fetch(
    `${UKYC_API_BASE_URL}/sessions/${sessionId}/wrapped-key`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({ idosSessionId }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `POST /sessions/${sessionId}/wrapped-key failed (${response.status}): ${errorBody}`,
    );
  }

  return await response.json();
}

const useSumSubDemo = () => {
  const [sdkResult, setSdkResult] = useState<Record<string, unknown> | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const launchSumSubSDK = useCallback(
    async (moonPayAccessToken: string | null, moonPayUserId: string | null) => {
      setIsLoading(true);
      setSdkResult(null);
      setStatus(null);

      try {
        if (!NativeModules.SNSMobileSDKModule) {
          throw new Error(
            'SumSub native module is not available. Rebuild the app with native dependencies (yarn start:ios or yarn start:android). Expo Go is not supported.',
          );
        }

        const mockJwtToken = 'mock-jwt-token';
        if (!moonPayAccessToken) {
          throw new Error('MoonPay access token not provided');
        }
        if (!moonPayUserId) {
          throw new Error('Auth customer ID not provided');
        }

        setStatus('Fetching wrapping key...');
        // Generate an ephemeral X25519 keypair for this session and hand the
        // public key to the UKYC API so it can establish a shared secret.
        const sessionClientPrivateKey = x25519.utils.randomSecretKey();
        const sessionClientPublicKey = x25519.getPublicKey(
          sessionClientPrivateKey,
        );
        const wrappingKeyResponse = await getWrappingKey(
          toBase64Url(sessionClientPublicKey),
        );
        console.log('[SumSubDemo] wrappingKeyResponse', wrappingKeyResponse);

        setStatus('Wrapping user key...');
        // Derive the data_encryption_key from the local_user_secret and wrap it
        // for the session server using the ECDH shared secret between our
        // session client key and the server's public key. Only the wrapped
        // (encrypted) key ever leaves the device.
        const localUserSecret = await getOrCreateLocalUserSecret();
        const { dataEncryptionKey } = deriveClientMaterial(localUserSecret);
        const wrappedEncryptionKey: WrappedEncryptionKey = {
          sessionId: wrappingKeyResponse.id,
          ...wrapEncryptionKey(
            sessionClientPrivateKey,
            wrappingKeyResponse.sessionServerPublicKey.x,
            dataEncryptionKey,
          ),
        };
        console.log('[SumSubDemo] wrappedEncryptionKey', wrappedEncryptionKey);

        setStatus('Creating UKYC session...');
        const { sessionId, idosSessionId } = await createSession(
          mockJwtToken,
          moonPayAccessToken,
          moonPayUserId,
          wrappedEncryptionKey,
        );

        // this shouldn't be needed anymore
        const wrappedUserKey = wrapUserKey(
          wrappingKeyResponse.sessionServerPublicKey.x,
          dataEncryptionKey,
        );

        console.log('[SumSubDemo] wrappedUserKey', wrappedUserKey);

        setStatus('Fetching access token...');
        const { applicantAccessToken } = await fetchAccessToken(
          sessionId,
          idosSessionId,
        );

        setStatus('Launching SumSub SDK...');
        const snsMobileSDK = SNSMobileSDK.init(
          applicantAccessToken,
          async () => {
            const { applicantAccessToken: refreshedAccessToken } =
              await fetchAccessToken(
                sessionId,
                idosSessionId,
              );
            return refreshedAccessToken;
          },
        )
          .withHandlers({
            onStatusChanged: (event: {
              prevStatus: string;
              newStatus: string;
            }) => {
              // eslint-disable-next-line no-console
              console.log(
                `[SumSub] Status: ${event.prevStatus} => ${event.newStatus}`,
              );
            },
            onLog: (event: { message: string }) => {
              // eslint-disable-next-line no-console
              console.log(`[SumSub] ${event.message}`);
            },
          })
          .withDebug(true)
          .withLocale('en')
          .build();

        const result: Record<string, unknown> = await snsMobileSDK.launch();
        // eslint-disable-next-line no-console
        console.log('[SumSub] Result:', JSON.stringify(result));
        setSdkResult(result);
        setStatus('Complete');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[SumSubDemo] Error:', err);
        setSdkResult({ error: String(err) });
        setStatus('Failed');
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { sdkResult, isLoading, status, launchSumSubSDK };
};

export default useSumSubDemo;
