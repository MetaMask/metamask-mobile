import {
  createHash,
  createPublicKey,
  randomBytes,
  type JsonWebKey,
} from 'node:crypto';
import { secp256k1 } from '@noble/curves/secp256k1';
import { personalSign } from '@metamask/eth-sig-util';
import { privateToAddress, toChecksumAddress } from 'ethereumjs-util';
import { config } from 'dotenv';
import {
  AuthType,
  JwtBearerAuth,
  Platform,
  getEnvUrls,
  getOidcClientId,
  type LoginResponse,
} from '@metamask/profile-sync-controller/sdk';
import { authEnv } from '../app/core/apiEnv';
import {
  getMfaRecoveryErrorCode,
  MfaRecoveryTestError,
  runMfaRecoveryCubistTest,
  type MfaRecoveryTestDependencies,
  type MfaRecoveryTestStep,
} from '../app/components/Views/Settings/DeveloperOptions/MfaRecoveryDeveloperOptionsSection/runMfaRecoveryCubistTest';

interface TestAuthOptions {
  tokenSource?: 'hydra' | 'auth-api';
  logAuthApiToken?: boolean;
}

/** Creates a signer for a disposable test wallet, never the app's wallet. */
export function createTestWallet(
  value: string | undefined,
  options: TestAuthOptions = {},
): MfaRecoveryTestDependencies {
  const hex = value?.trim().replace(/^0x/u, '');
  if (!hex || !/^[0-9a-fA-F]{64}$/u.test(hex)) {
    throw new MfaRecoveryTestError(
      'Set MM_MFA_RECOVERY_TEST_PRIVATE_KEY to a disposable 32-byte test key',
      'invalid_test_private_key',
    );
  }

  const privateKey = Buffer.from(hex, 'hex');
  let address: string;
  try {
    address = toChecksumAddress(
      `0x${privateToAddress(privateKey).toString('hex')}`,
    );
  } catch {
    throw new MfaRecoveryTestError(
      'The test private key is outside the secp256k1 range',
      'invalid_test_private_key',
    );
  }

  const publicKey = `0x${Buffer.from(secp256k1.getPublicKey(privateKey, false)).toString('hex')}`;
  const signMessage = async (message: string): Promise<string> => {
    const digest = createHash('sha256').update(message, 'utf8').digest();
    const signature = secp256k1.sign(digest, privateKey, { prehash: false });
    return `0x${Buffer.from(signature.toBytes('compact')).toString('hex')}`;
  };
  let loginResponse: LoginResponse | null = null;
  const auth = new JwtBearerAuth(
    { env: authEnv(), platform: Platform.MOBILE, type: AuthType.SRP },
    {
      storage: {
        async getLoginResponse(): Promise<LoginResponse | null> {
          return loginResponse;
        },
        async setLoginResponse(response: LoginResponse): Promise<void> {
          loginResponse = response;
        },
      },
      signing: {
        getIdentifier: async () => publicKey,
        signMessage,
      },
    },
  );

  return {
    address,
    getAuthSession: async () => {
      if (options.tokenSource === 'auth-api') {
        const baseUrl = getEnvUrls(authEnv()).authApiUrl;
        const nonceUrl = new URL(`${baseUrl}/api/v2/nonce`);
        nonceUrl.searchParams.set('identifier', publicKey);
        const nonceResponse = await fetch(nonceUrl);
        if (!nonceResponse.ok) {
          throw new MfaRecoveryTestError(
            `Auth API nonce failed with HTTP ${nonceResponse.status}`,
            'auth_nonce_failed',
          );
        }
        const nonceBody: unknown = await nonceResponse.json();
        if (
          !nonceBody ||
          typeof nonceBody !== 'object' ||
          !('nonce' in nonceBody) ||
          typeof nonceBody.nonce !== 'string' ||
          !nonceBody.nonce
        ) {
          throw new MfaRecoveryTestError(
            'Auth API returned a malformed nonce',
            'auth_nonce_response_invalid',
          );
        }
        const rawMessage = `metamask:${nonceBody.nonce}:${publicKey}`;
        const response = await fetch(`${baseUrl}/api/v2/srp/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-MetaMask-Profile-Pairing': 'enabled',
          },
          body: JSON.stringify({
            raw_message: rawMessage,
            signature: await signMessage(rawMessage),
          }),
        });
        if (!response.ok) {
          throw new MfaRecoveryTestError(
            `Failed to login with SRP: HTTP ${response.status}`,
            'auth_login_failed',
          );
        }
        const body: unknown = await response.json();
        if (
          !body ||
          typeof body !== 'object' ||
          !('token' in body) ||
          typeof body.token !== 'string' ||
          !body.token.trim() ||
          !('profile' in body) ||
          !body.profile ||
          typeof body.profile !== 'object' ||
          !('profile_id' in body.profile) ||
          typeof body.profile.profile_id !== 'string' ||
          !body.profile.profile_id.trim()
        ) {
          throw new MfaRecoveryTestError(
            'Auth API returned a malformed login response',
            'auth_login_response_invalid',
          );
        }
        if (options.logAuthApiToken) {
          console.warn(
            'Local testing only: the following JWT is a bearer credential.',
          );
          console.log('Auth API JWT assertion:', body.token);
          try {
            const [header, payload] = body.token.split('.');
            const decoded: { header: unknown; payload: unknown } = {
              header: JSON.parse(Buffer.from(header, 'base64url').toString('utf8')),
              payload: JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')),
            };
            console.log(
              'Auth API JWT decoded (inspection only; signature not verified):\n' +
                JSON.stringify(decoded, null, 2),
            );
          } catch {
            console.warn('Auth API JWT could not be decoded for inspection.');
          }
        }
        return {
          accessToken: await exchangeForHydraToken(body.token),
        };
      }
      const accessToken = await auth.getAccessToken();
      return { accessToken };
    },
    randomBytes: (length) => new Uint8Array(randomBytes(length)),
    signPersonalMessage: async ({ data, from }) => {
      if (from.toLowerCase() !== address.toLowerCase()) {
        throw new MfaRecoveryTestError(
          'The requested signer does not match the test wallet',
          'test_signer_mismatch',
        );
      }
      return personalSign({ privateKey, data });
    },
  };
}

/** Exchanges an Auth API login assertion for a Hydra access token. */
async function exchangeForHydraToken(assertion: string): Promise<string> {
  const response = await fetch(
    `${getEnvUrls(authEnv()).oidcApiUrl}/oauth2/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        client_id: getOidcClientId(authEnv(), Platform.MOBILE),
        assertion,
      }).toString(),
    },
  );
  if (!response.ok) {
    throw new MfaRecoveryTestError(
      `Hydra token exchange failed with HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`,
      'hydra_token_exchange_failed',
    );
  }
  return ((await response.json()) as { access_token: string }).access_token;
}

/** Overrides one SDK base URL (Auth API or Hydra) in this standalone Node process. */
export function configureEnvUrl(
  key: 'authApiUrl' | 'oidcApiUrl',
  name: string,
  value: string | undefined,
): void {
  if (!value?.trim()) {
    return;
  }
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new MfaRecoveryTestError(
      `${name} must be an HTTP(S) base URL`,
      'invalid_env_url',
    );
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new MfaRecoveryTestError(
      `${name} must be an HTTP(S) base URL without credentials, query, or fragment`,
      'invalid_env_url',
    );
  }
  // The SDK returns its shared URL configuration; every request reads this
  // same object at call time.
  getEnvUrls(authEnv())[key] = url.toString().replace(/\/$/u, '');
}

/** Normalizes a public P-256 PEM or JWK to the controller's JWK JSON format. */
export function normalizeEscrowPublicKey(
  value: string | undefined,
  name: string,
): string {
  try {
    const input = value?.trim();
    if (!input) {
      throw new Error('Missing public key');
    }
    let key;
    if (input.startsWith('{')) {
      const jwk: unknown = JSON.parse(input);
      if (jwk === null || typeof jwk !== 'object' || 'd' in jwk) {
        throw new Error('Expected a public JWK');
      }
      key = createPublicKey({ key: jwk as JsonWebKey, format: 'jwk' });
    } else {
      if (!input.startsWith('-----BEGIN PUBLIC KEY-----')) {
        throw new Error('Expected a public PEM');
      }
      key = createPublicKey(input.replace(/\\n/gu, '\n'));
    }
    const jwk = key.export({ format: 'jwk' });
    if (jwk.kty !== 'EC' || jwk.crv !== 'P-256') {
      throw new Error('Expected a P-256 key');
    }
    return JSON.stringify(jwk);
  } catch {
    throw new MfaRecoveryTestError(
      `${name} must be a P-256 public key in PEM or JWK JSON format`,
      'invalid_escrow_public_key',
    );
  }
}

/** Runs the same live round trip as Developer Options without React Native. */
export async function main(): Promise<void> {
  // dotenv accepts the `export NAME=value` syntax used by .js.env.
  // Existing shell variables take precedence; never print parsed configuration.
  config({ path: '.js.env' });
  let step: MfaRecoveryTestStep | undefined;

  try {
    configureEnvUrl(
      'authApiUrl',
      'MM_MFA_RECOVERY_AUTH_API_URL',
      process.env.MM_MFA_RECOVERY_AUTH_API_URL,
    );
    configureEnvUrl(
      'oidcApiUrl',
      'MM_MFA_RECOVERY_OIDC_URL',
      process.env.MM_MFA_RECOVERY_OIDC_URL,
    );
    const tokenSource = process.env.MM_MFA_RECOVERY_TOKEN_SOURCE ?? 'auth-api';
    if (tokenSource !== 'hydra' && tokenSource !== 'auth-api') {
      throw new MfaRecoveryTestError(
        'MM_MFA_RECOVERY_TOKEN_SOURCE must be hydra or auth-api',
        'invalid_token_source',
      );
    }
    const wallet = createTestWallet(
      process.env.MM_MFA_RECOVERY_TEST_PRIVATE_KEY,
      {
        tokenSource,
        logAuthApiToken: process.env.MM_MFA_RECOVERY_LOG_AUTH_TOKEN === 'true',
      },
    );
    for (const name of [
      'MM_CUBIST_WRAP_PUBLIC_KEY',
      'MM_CUBIST_RECEIPT_PUBLIC_KEY',
    ]) {
      process.env[name] = normalizeEscrowPublicKey(process.env[name], name);
    }
    console.log(`Authentication token source: ${tokenSource}`);
    console.log(
      'Running live Cubist recovery test: register, updateRecoverySecret, and updateIdentifiers with MPC request-bound authorization.',
    );
    const result = await runMfaRecoveryCubistTest(wallet, (nextStep) => {
      step = nextStep;
      console.log(`MFA recovery: ${step}`);
    });
    if (!result.matches) {
      throw new MfaRecoveryTestError(
        'The recovered secret does not match',
        'recovery_secret_mismatch',
      );
    }
    console.log(
      `Recovery test passed (epoch: ${result.epoch}, secret matches: yes).`,
    );
  } catch (error) {
    // Do not print raw SDK errors: they can contain credentials or payloads.
    const errorType =
      error instanceof Error && /^[A-Za-z]*Error$/u.test(error.name)
        ? error.name
        : undefined;
    const errorMessage =
      error instanceof Error && typeof error.message === 'string'
        ? error.message
        : '';
    const httpStatus = /\bHTTP (\d{3})\b/u.exec(errorMessage)?.[1];
    const authStage =
      errorMessage.startsWith('Failed to login with')
        ? 'srp_login'
        : errorMessage.startsWith('Failed to get access token')
          ? 'oauth_token_exchange'
          : undefined;
    const diagnostics = [
      `step: ${step ?? 'configuration'}`,
      ...(authStage ? [`auth stage: ${authStage}`] : []),
      ...(errorType ? [`type: ${errorType}`] : []),
      ...(httpStatus ? [`HTTP: ${httpStatus}`] : []),
    ].join(', ');
    console.error(
      `Recovery test failed: ${getMfaRecoveryErrorCode(error)} (${diagnostics}).`,
    );
    if (
      step === 'creating_cubist_session' &&
      error !== null &&
      typeof error === 'object'
    ) {
      const fields = error as Record<string, unknown>;
      const cubistDetails: Record<string, string | number> = {};
      if (
        typeof fields.status === 'number' &&
        Number.isInteger(fields.status) &&
        fields.status >= 100 &&
        fields.status <= 599
      ) {
        cubistDetails.status = fields.status;
      }
      for (const field of ['errorCode', 'operation', 'requestId', 'statusText']) {
        const value = fields[field];
        if (
          typeof value === 'string' &&
          /^[A-Za-z0-9 _.:/-]{1,128}$/u.test(value)
        ) {
          cubistDetails[field] = value;
        }
      }
      if (Object.keys(cubistDetails).length > 0) {
        console.error(
          'Cubist error details:',
          JSON.stringify(cubistDetails, null, 2),
        );
      }
    }
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
