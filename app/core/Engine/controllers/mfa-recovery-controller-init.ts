import { CubeSignerClient, envs } from '@cubist-labs/cubesigner-sdk';
import {
  CubistEscrowProvider,
  MfaRecoveryController,
  type AuthControllerToken,
  type EcPublicJwk,
  type Identifier,
  type IdentifierAuthorization,
  type MfaRecoveryControllerMessenger,
  type MfaRecoveryControllerState,
  type Mutation,
  type MutationPayload,
  type MutationReceipt,
  type PendingOperation,
  type PendingOperationEncryptor,
  type RecoveryAuthProvider,
  type RecoveryEscrowProvider,
} from '@metamask/mfa-recovery-controller';
import {
  base64ToBytes,
  bytesToHex,
  bytesToString,
  sha256,
  stringToBytes,
  type Json,
} from '@metamask/utils';
import { createMoneyMfaOidcIdentifierAuthProvider } from '../../MfaRecovery';
import type { EncryptionResult } from '../../Encryptor/types';
import type { MessengerClientInitFunction } from '../types';
import type { MfaRecoveryControllerInitMessenger } from '../messengers/mfa-recovery-controller-messenger';

/** Dev Cubist gamma org + pinned wrap/receipt keys (same as CW test stack). */
const DEV_CUBIST = {
  environment: 'gamma' as const,
  orgId: 'Org#5eade91b-cd05-4af6-a974-77f63cc344f6',
  wrapPublicKey:
    '{"kty":"EC","crv":"P-256","x":"foxf_AOcFNGsgnoxVHOEJhKj2cJ8nSOc2k0nMhlg2Jg","y":"yPOdEM3E-xpMuz0vaB9yjWoSixzDfTIrrmuTkmr4ePg"}',
  receiptPublicKey:
    '{"kty":"EC","crv":"P-256","x":"t9qe4__2l7ypZGjcQFBW29TaIU_04JXDvOzK9fNBsmM","y":"j-jWICPw4zUbiJaR9AO_PwmhN-mzYICgfPi-TxLhZS8"}',
  scopes: ['manage:policy:get', 'manage:policy:invoke'] as const,
  registrationUrl: 'https://recovery-registration.dev-api.cx.metamask.io',
};

const TOKEN_API_HOST = 'https://mpc-service-non-enclave.dev-api.cx.metamask.io';
const TOKEN_API_KEY_HEADER = 'x-api-key';

/**
 * Minimal Engine wiring for Tyler’s Telegram Cubist debugger path:
 * preview `MfaRecoveryController` + gamma Cubist escrow + MFA-703 OIDC provider.
 *
 * Cubist session (Tyler):
 * 1. AuthenticationController bearer → profile `sub`
 * 2. POST mpc-service `/token` with `x-api-key: MFA_RECOVERY_DEV_API_KEY`
 * 3. POST recovery-registration `/v1/recovery/registration/oidc-token`
 *    with that access token → `{ idToken, expiresAt }`
 * 4. `CubeSignerClient.createOidcSession(gamma, orgId, idToken, scopes)`
 *    (raw idToken, no Bearer)
 *
 * Telegram/Google/Apple ID tokens are NOT used for the Cubist session; they
 * only appear later as key-bound identifier proofs on register/update/recover.
 */
export const mfaRecoveryControllerInit: MessengerClientInitFunction<
  MfaRecoveryController,
  MfaRecoveryControllerMessenger,
  MfaRecoveryControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState }) => {
  const getBearerToken = async () =>
    await initMessenger.call('AuthenticationController:getBearerToken');
  const exportEncryptionKey = async () =>
    await initMessenger.call('KeyringController:exportEncryptionKey');

  const authProvider = createMpcTokenAuthProvider({
    getBearerToken,
    apiKey: process.env.MFA_RECOVERY_DEV_API_KEY ?? '',
  });

  const identifierAuthProvider = createMoneyMfaOidcIdentifierAuthProvider({
    getRemoteFeatureFlags: () =>
      initMessenger.call('RemoteFeatureFlagController:getState')
        .remoteFeatureFlags as Record<string, unknown> | undefined,
  });

  const escrow = createLazyCubistEscrowProvider({ authProvider });
  const pendingOperationEncryptor =
    createKeyringPendingOperationEncryptor(exportEncryptionKey);

  const controller = new MfaRecoveryController({
    messenger: controllerMessenger,
    state: persistedState.MfaRecoveryController as
      | Partial<MfaRecoveryControllerState>
      | undefined,
    authProvider,
    identifierAuthProvider,
    escrows: [escrow],
    pendingOperationEncryptor,
  });

  return { controller };
};

function createMpcTokenAuthProvider({
  getBearerToken,
  apiKey,
}: {
  getBearerToken: () => Promise<string>;
  apiKey: string;
}): RecoveryAuthProvider & { getAccessToken: () => Promise<string> } {
  /**
   * Mint via mpc-service-non-enclave (requires MFA_RECOVERY_DEV_API_KEY).
   * Cubist session oidc-token must use THIS token — not the Hydra bearer
   * (Tyler). Feeding Hydra into oidc-token yields an idToken Cubist rejects.
   */
  const mintToken = async (
    ext?: Record<string, unknown>,
    audiences?: string[],
  ): Promise<string> => {
    if (!apiKey.trim()) {
      throw new Error('MFA_RECOVERY_DEV_API_KEY is not configured');
    }
    const bearerToken = await getBearerToken();
    const profileId = getJwtSubject(bearerToken);
    const response = await fetch(
      new URL('/token', `${TOKEN_API_HOST}/`).toString(),
      {
        method: 'POST',
        headers: {
          [TOKEN_API_KEY_HEADER]: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: profileId,
          ...(audiences === undefined ? {} : { aud: audiences }),
          ...(ext === undefined ? {} : { ext }),
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`Failed to mint access token: HTTP ${response.status}`);
    }
    const body: unknown = await response.json();
    if (!isRecord(body) || typeof body.token !== 'string') {
      throw new Error('Token API returned an invalid access token response');
    }
    return body.token;
  };

  return {
    // Step 2 access token for recovery-registration oidc-token (Cubist session).
    getAccessToken: async () => await mintToken(),
    getAuthenticatedProfileId: async () =>
      getJwtSubject(await getBearerToken()),
    authorizeRecoveryRequest: async (params) => {
      const identifiersHash =
        params.identifiers === undefined
          ? undefined
          : await hashIdentifiers(params.identifiers);
      return await mintToken(
        {
          request_hash: params.requestHash,
          ...(params.requireTwoFactor ? { aal: 2 } : {}),
          ...(identifiersHash === undefined
            ? {}
            : { identifiers_hash: identifiersHash }),
        },
        params.audiences,
      );
    },
  };
}

function createLazyCubistEscrowProvider({
  authProvider,
}: {
  authProvider: RecoveryAuthProvider & {
    getAccessToken: () => Promise<string>;
  };
}): RecoveryEscrowProvider {
  let provider: CubistEscrowProvider | undefined;
  let profileId: string | undefined;
  let expiresAt = 0;
  let wrapPublicKey = DEV_CUBIST.wrapPublicKey;

  const getProvider = async (): Promise<CubistEscrowProvider> => {
    const nextProfileId = await authProvider.getAuthenticatedProfileId();
    if (
      provider &&
      profileId === nextProfileId &&
      expiresAt > Math.floor(Date.now() / 1000)
    ) {
      return provider;
    }

    console.log(
      '[MfaRecovery Cubist] bootstrap via MPC access token → oidc-token',
    );
    const accessToken = await authProvider.getAccessToken();
    const oidcToken = await requestOidcToken(accessToken);
    console.log('[MfaRecovery Cubist] oidc-token ok', {
      expiresAt: oidcToken.expiresAt,
      idTokenLen: oidcToken.idToken.length,
    });
    try {
      const sessionResponse = await CubeSignerClient.createOidcSession(
        envs[DEV_CUBIST.environment],
        DEV_CUBIST.orgId,
        oidcToken.idToken,
        [...DEV_CUBIST.scopes],
      );
      const client = await CubeSignerClient.create(sessionResponse.data());
      wrapPublicKey = DEV_CUBIST.wrapPublicKey;
      provider = new CubistEscrowProvider({
        client,
        wrapPublicKey: DEV_CUBIST.wrapPublicKey,
        receiptPublicKey: DEV_CUBIST.receiptPublicKey,
      });
      profileId = nextProfileId;
      expiresAt = oidcToken.expiresAt;
      console.log('[MfaRecovery Cubist] CubeSigner session ok');
      return provider;
    } catch (error) {
      console.warn(
        '[MfaRecovery Cubist] createOidcSession failed',
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  };

  return {
    id: 'cubist',
    authAudience: 'cubist',
    get wrapPublicKey() {
      return wrapPublicKey;
    },
    isAvailable: async () => {
      try {
        const available = await (await getProvider()).isAvailable();
        console.log('[MfaRecovery Cubist] isAvailable', available);
        return available;
      } catch (error) {
        console.warn(
          '[MfaRecovery Cubist] isAvailable failed',
          error instanceof Error ? error.message : error,
        );
        return false;
      }
    },
    generateChallenge: async () =>
      await (await getProvider()).generateChallenge(),
    getSecret: async (
      authorization: IdentifierAuthorization,
      requestId: string,
      pkE: EcPublicJwk,
    ) => await (await getProvider()).getSecret(authorization, requestId, pkE),
    applyMutation: async (
      mutation: Mutation,
      authControllerToken: AuthControllerToken,
      identifierAuthorization: IdentifierAuthorization | null,
      payload: MutationPayload,
    ): Promise<MutationReceipt> =>
      await (
        await getProvider()
      ).applyMutation(
        mutation,
        authControllerToken,
        identifierAuthorization,
        payload,
      ),
    verifyReceipt: (receipt, mutation, expectedEscrowId) => {
      if (!provider) {
        throw new Error('Cubist escrow session has not been created');
      }
      return provider.verifyReceipt(receipt, mutation, expectedEscrowId);
    },
  };
}

async function requestOidcToken(
  accessToken: string,
): Promise<{ idToken: string; expiresAt: number }> {
  const response = await fetch(
    new URL(
      '/v1/recovery/registration/oidc-token',
      `${DEV_CUBIST.registrationUrl}/`,
    ).toString(),
    { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error(
      `Recovery registration failed with HTTP ${response.status}`,
    );
  }
  const body: unknown = await response.json();
  if (
    !isRecord(body) ||
    typeof body.idToken !== 'string' ||
    body.idToken.trim().length === 0 ||
    typeof body.expiresAt !== 'number' ||
    !Number.isFinite(body.expiresAt)
  ) {
    throw new Error('Recovery registration returned an invalid OIDC token');
  }
  if (body.expiresAt <= Math.floor(Date.now() / 1000)) {
    throw new Error('Recovery registration returned an expired OIDC token');
  }
  return { idToken: body.idToken, expiresAt: body.expiresAt };
}

function createKeyringPendingOperationEncryptor(
  exportEncryptionKey: () => Promise<string>,
): PendingOperationEncryptor {
  const encryptorPromise = import('../../Encryptor').then(
    ({ Encryptor, LEGACY_DERIVATION_OPTIONS }) =>
      new Encryptor({
        keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
      }),
  );
  const importCurrentKey = async () =>
    await (await encryptorPromise).importKey(await exportEncryptionKey());

  return {
    async encrypt(operation: PendingOperation): Promise<string> {
      const key = await importCurrentKey();
      const encrypted = await (
        await encryptorPromise
      ).encryptWithKey(key, operation as unknown as Json);
      return JSON.stringify(encrypted);
    },
    async decrypt(ciphertext: string): Promise<PendingOperation> {
      const key = await importCurrentKey();
      const payload = JSON.parse(ciphertext) as EncryptionResult;
      return (await (
        await encryptorPromise
      ).decryptWithKey(key, payload)) as PendingOperation;
    },
  };
}

async function hashIdentifiers(identifiers: Identifier[]): Promise<string> {
  const canonicalIdentifiers = identifiers
    .map((identifier) => ({
      namespace: identifier.namespace,
      type: identifier.type,
      value: identifier.value,
      verifier: identifier.verifier,
    }))
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );
  return bytesToHex(
    await sha256(stringToBytes(JSON.stringify(canonicalIdentifiers))),
  );
}

function getJwtSubject(accessToken: string): string {
  const encodedPayload = accessToken.split('.')[1];
  if (encodedPayload === undefined) {
    throw new Error('Authentication bearer token is not a valid JWT');
  }
  const base64Payload = encodedPayload
    .replace(/-/gu, '+')
    .replace(/_/gu, '/')
    .padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=');
  const payload: unknown = JSON.parse(
    bytesToString(base64ToBytes(base64Payload)),
  );
  if (!isRecord(payload) || typeof payload.sub !== 'string') {
    throw new Error(
      'Authentication bearer token is missing a string sub claim',
    );
  }
  return payload.sub;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
