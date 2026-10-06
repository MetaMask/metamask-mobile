import {
  base64ToBytes,
  bytesToBase64,
  bytesToHex,
  bytesToString,
  hexToBytes,
  sha256,
  stringToBytes,
} from '@metamask/utils';
import type {
  Identifier,
  PendingOperation,
  PendingOperationEncryptor,
  RecoveryAuthProvider,
  RecoveryIdentifierAuthProvider,
} from '@metamask/mfa-recovery-controller';
import { SoftwarePasskey, base64Url } from './softwarePasskey';

/** Must be allowed by the escrow's IDENTIFIER_POLICY (siwe domains/chainIds). */
export const SIWE_DOMAIN = 'metamask.io';
export const SIWE_CHAIN_ID = 1;
/** Must be allowed by the escrow's IDENTIFIER_POLICY (passkey rpIds/origins). */
export const PASSKEY_RP_ID = 'metamask.io';
export const PASSKEY_ORIGIN = 'https://metamask.io';
const DEFAULT_TOKEN_API_HOST =
  'https://mpc-service-non-enclave.dev-api.cx.metamask.io';
const TOKEN_API_KEY_HEADER = 'x-api-key';

type SignPersonalMessage = (params: {
  data: string;
  from: string;
}) => Promise<string>;

interface StubAuthProviderOptions {
  accessToken: string;
  apiKey: string;
  apiHost?: string;
}

/**
 * Recovery auth provider that derives the profile ID from the app access token
 * and mints request-bound JWTs through the MPC token service.
 */
export class StubAuthProvider implements RecoveryAuthProvider {
  readonly #profileId: string;

  readonly #apiKey: string;

  readonly #apiHost: string;

  constructor({
    accessToken,
    apiKey,
    apiHost = DEFAULT_TOKEN_API_HOST,
  }: StubAuthProviderOptions) {
    this.#profileId = getJwtSubject(accessToken);
    this.#apiKey = apiKey;
    this.#apiHost = apiHost;
  }

  async getAccessToken(): Promise<string> {
    return await this.#mintToken();
  }

  async getAuthenticatedProfileId(): Promise<string> {
    return this.#profileId;
  }

  async authorizeRecoveryRequest(params: {
    requestHash: string;
    requireTwoFactor?: boolean;
    identifiers?: Identifier[];
  }): Promise<string> {
    const identifiersHash =
      params.identifiers === undefined
        ? undefined
        : await hashIdentifiers(params.identifiers);

    return await this.#mintToken({
      requestHash: toBase64Url(hexToBytes(params.requestHash)),
      ...(params.requireTwoFactor
        ? { aal: 'aal2', amr: ['totp', 'passkey'] }
        : {}),
      ...(identifiersHash === undefined ? {} : { identifiersHash }),
    });
  }

  async #mintToken(ext?: Record<string, unknown>): Promise<string> {
    const response = await fetch(
      new URL('/token', `${this.#apiHost}/`).toString(),
      {
        method: 'POST',
        headers: {
          [TOKEN_API_KEY_HEADER]: this.#apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: this.#profileId,
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
  }
}

/**
 * Signs key-bound SIWE identifier proofs with the primary account.
 */
export class SiweIdentifierAuthProvider
  implements RecoveryIdentifierAuthProvider
{
  readonly #address: string;

  readonly #signPersonalMessage: SignPersonalMessage;

  constructor(address: string, signPersonalMessage: SignPersonalMessage) {
    this.#address = address;
    this.#signPersonalMessage = signPersonalMessage;
  }

  async getKeyBoundIdentifierToken(params: {
    identifier: Identifier;
    proofPublicKey: string;
    requestHash: string;
  }): Promise<{
    identifier: Identifier;
    proofPublicKey: string;
    requestHash: string;
    providerAssertion: unknown;
  }> {
    // The escrow requires nonce = hash([proofPublicKey, requestHash]).
    const nonce = bytesToHex(
      await sha256(
        stringToBytes(
          JSON.stringify([params.proofPublicKey, params.requestHash]),
        ),
      ),
    );
    const message = [
      `${SIWE_DOMAIN} wants you to sign in with your Ethereum account:`,
      this.#address,
      '',
      'Authorize MetaMask MFA recovery.',
      '',
      `URI: https://${SIWE_DOMAIN}`,
      'Version: 1',
      `Chain ID: ${SIWE_CHAIN_ID}`,
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString()}`,
    ].join('\n');
    const signature = await this.#signPersonalMessage({
      from: this.#address,
      data: bytesToHex(stringToBytes(message)),
    });

    return {
      identifier: params.identifier,
      proofPublicKey: params.proofPublicKey,
      requestHash: params.requestHash,
      providerAssertion: { message, signature },
    };
  }
}

/**
 * Signs key-bound passkey identifier proofs with in-memory software passkeys.
 */
export class PasskeyIdentifierAuthProvider
  implements RecoveryIdentifierAuthProvider
{
  readonly #passkeys = new Map<string, SoftwarePasskey>();

  /** Creates a passkey and returns its recovery identifier. */
  createIdentifier(): Identifier {
    const passkey = new SoftwarePasskey();
    this.#passkeys.set(passkey.credentialId, passkey);
    return {
      type: 'passkey',
      namespace: PASSKEY_RP_ID,
      value: passkey.credentialId,
      verifier: {
        rpId: PASSKEY_RP_ID,
        origins: [PASSKEY_ORIGIN],
        credentialId: passkey.credentialId,
        publicKey: passkey.publicJwk,
      },
    };
  }

  async getKeyBoundIdentifierToken(params: {
    identifier: Identifier;
    proofPublicKey: string;
    requestHash: string;
  }) {
    const passkey = this.#passkeys.get(params.identifier.value);
    if (!passkey) {
      throw new Error('Unknown test passkey');
    }
    // The escrow requires challenge = the raw digest of hash([proofPublicKey, requestHash]).
    const challenge = base64Url(
      await sha256(
        stringToBytes(
          JSON.stringify([params.proofPublicKey, params.requestHash]),
        ),
      ),
    );
    const { id, response } = await passkey.get({
      rpId: PASSKEY_RP_ID,
      origin: PASSKEY_ORIGIN,
      challenge,
    });
    return {
      identifier: params.identifier,
      proofPublicKey: params.proofPublicKey,
      requestHash: params.requestHash,
      providerAssertion: { id, response },
    };
  }
}

/**
 * JSON round-trip encryptor for the developer test.
 */
export const passthroughEncryptor: PendingOperationEncryptor = {
  async encrypt(operation: PendingOperation): Promise<string> {
    return JSON.stringify(operation);
  },

  async decrypt(ciphertext: string): Promise<PendingOperation> {
    return JSON.parse(ciphertext) as PendingOperation;
  },
};

async function hashIdentifiers(identifiers: Identifier[]): Promise<string> {
  const canonicalIdentifiers = identifiers
    .map((identifier) => ({
      namespace: identifier.namespace,
      type: identifier.type,
      value: identifier.value,
      verifier: identifier.verifier,
    }))
    .sort((left, right) =>
      canonicalize(left).localeCompare(canonicalize(right)),
    );

  return bytesToHex(
    await sha256(stringToBytes(canonicalize(canonicalIdentifiers))),
  );
}

function getJwtSubject(accessToken: string): string {
  const encodedPayload = accessToken.split('.')[1];
  if (encodedPayload === undefined) {
    throw new Error('Authentication bearer token is not a valid JWT');
  }

  let payload: unknown;
  try {
    const base64Payload = encodedPayload
      .replace(/-/gu, '+')
      .replace(/_/gu, '/')
      .padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=');
    payload = JSON.parse(bytesToString(base64ToBytes(base64Payload)));
  } catch {
    throw new Error('Authentication bearer token payload is invalid');
  }

  if (!isRecord(payload) || typeof payload.sub !== 'string') {
    throw new Error(
      'Authentication bearer token is missing a string sub claim',
    );
  }

  return payload.sub;
}

function toBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_')
    .replaceAll('=', '');
}

function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value)) ?? 'null';
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (isRecord(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = sortKeys(value[key]);
        return sorted;
      }, {});
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
