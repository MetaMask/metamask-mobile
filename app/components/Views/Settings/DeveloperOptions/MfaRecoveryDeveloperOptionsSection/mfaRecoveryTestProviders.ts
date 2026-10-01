import { bytesToHex, sha256, stringToBytes } from '@metamask/utils';
import type {
  AuthControllerToken,
  Identifier,
  PendingOperation,
  PendingOperationEncryptor,
  RecoveryAuthProvider,
  RecoveryIdentifierAuthProvider,
} from '@metamask/mfa-recovery-controller';

const AUTH_TOKEN_LIFETIME_SECONDS = 60 * 60;

type SignPersonalMessage = (params: {
  data: string;
  from: string;
}) => Promise<string>;

/**
 * Test-only AuthController replacement for the developer flow.
 *
 * The AuthenticationController bearer token is carried in `signature` so the
 * escrow receives the same SRP session token used for the Cubist OIDC login.
 */
export class StubAuthProvider implements RecoveryAuthProvider {
  readonly #profileId: string;

  readonly #accessToken: string;

  readonly #now: () => number;

  constructor(
    profileId: string,
    accessToken: string,
    now = () => Math.floor(Date.now() / 1000),
  ) {
    this.#profileId = profileId;
    this.#accessToken = accessToken;
    this.#now = now;
  }

  async getAuthenticatedProfileId(): Promise<string> {
    return this.#profileId;
  }

  async authorizeRecoveryRequest(params: {
    requestHash: string;
    requireTwoFactor?: boolean;
    identifiers?: Identifier[];
  }): Promise<AuthControllerToken> {
    const identifiersHash =
      params.identifiers === undefined
        ? undefined
        : await hashIdentifiers(params.identifiers);

    return {
      profileId: this.#profileId,
      requestHash: params.requestHash,
      ...(params.requireTwoFactor ? { twoFactor: true as const } : {}),
      ...(identifiersHash === undefined
        ? {}
        : {
            identifiersHash,
            identifierOwnershipApproved: true as const,
          }),
      issuer: 'mfa-recovery-developer-test',
      expiresAt: this.#now() + AUTH_TOKEN_LIFETIME_SECONDS,
      signature: this.#accessToken,
    };
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
    const message = [
      'MetaMask MFA recovery identifier proof',
      `Address: ${this.#address}`,
      `Proof public key: ${params.proofPublicKey}`,
      `Request hash: ${params.requestHash}`,
    ].join('\n');
    const signature = await this.#signPersonalMessage({
      from: this.#address,
      data: bytesToHex(stringToBytes(message)),
    });

    return {
      identifier: params.identifier,
      proofPublicKey: params.proofPublicKey,
      requestHash: params.requestHash,
      providerAssertion: {
        type: 'siwe',
        address: this.#address,
        message,
        signature,
      },
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
