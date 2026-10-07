// Local copy of `CubistEscrowProvider` from `@metamask/mfa-recovery-controller`
// (`src/escrow-providers/cubist-escrow-provider.ts`). The crypto and receipt
// helpers it depends on are package internals, so they are inlined below.
import type {
  C2FResponse,
  CubeSignerClient,
  JsonValue,
  Version,
} from '@cubist-labs/cubesigner-sdk';
import {
  MfaRecoveryError,
  type AuthControllerToken,
  type EcPublicJwk,
  type IdentifierAuthorization,
  type Mutation,
  type MutationPayload,
  type MutationReceipt,
  type RecoveryEscrowProvider,
} from '@metamask/mfa-recovery-controller';
import {
  base64ToBytes,
  bytesToHex,
  concatBytes,
  hexToBytes,
  stringToBytes,
  type Hex,
} from '@metamask/utils';
import { p256 } from '@noble/curves/nist';
import { sha256 } from '@noble/hashes/sha2';

const ESCROW_ID = 'cubist';
const AUTH_AUDIENCE = 'cubist';
const DEFAULT_FUNCTION_ID = 'cubist_secret_escrow';
const DEFAULT_VERSION: Version = 'latest';

type PoPChallenge = Awaited<
  ReturnType<RecoveryEscrowProvider['generateChallenge']>
>;
type GetRecoverySecretResponse = Awaited<
  ReturnType<RecoveryEscrowProvider['getSecret']>
>;

/**
 * CubeSigner C2F client for the Cubist recovery escrow.
 *
 * Commands are invoked as `{ cmd, ...fields }` on `cubist_secret_escrow`.
 * Escrow JSON is read from C2F stdout. Receipt signatures are checked locally
 * with the pinned receipt public key.
 */
export interface CubistEscrowProviderOptions {
  /**
   * Authenticated CubeSigner client used to load and invoke the escrow C2F.
   */
  client: CubeSignerClient;
  /**
   * C2F name or named-policy id. Defaults to `cubist_secret_escrow`.
   */
  functionId?: string;
  /**
   * C2F version to invoke. Defaults to `latest`.
   */
  version?: Version;
  /**
   * P-256 public JWK JSON for the escrow wrap key.
   */
  wrapPublicKey: string;
  /**
   * P-256 public JWK JSON for the escrow receipt key.
   */
  receiptPublicKey: string;
}

export class CubistEscrowProvider implements RecoveryEscrowProvider {
  readonly id = ESCROW_ID;

  readonly authAudience = AUTH_AUDIENCE;

  readonly wrapPublicKey: string;

  readonly #receiptPublicKey: string;

  readonly #client: CubeSignerClient;

  readonly #functionId: string;

  readonly #version: Version;

  /**
   * @param options - CubeSigner client, pinned keys, and optional C2F id/version.
   */
  constructor(options: CubistEscrowProviderOptions) {
    this.wrapPublicKey = options.wrapPublicKey;
    this.#receiptPublicKey = options.receiptPublicKey;
    this.#client = options.client;
    this.#functionId = options.functionId ?? DEFAULT_FUNCTION_ID;
    this.#version = options.version ?? DEFAULT_VERSION;
  }

  /**
   * @returns Whether the escrow C2F can be loaded.
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.#client.apiClient.userGet();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * @returns A proof-of-possession challenge for this escrow.
   */
  async generateChallenge(): Promise<PoPChallenge> {
    return await this.#invoke('generateChallenge', {}, parseChallenge);
  }

  /**
   * @param authorization - Identifier proof for this read.
   * @param requestId - Client request id bound into the read hash.
   * @param pkE - Ephemeral wrap public key for the response.
   * @returns The wrapped recovery secret and its version.
   */
  async getSecret(
    authorization: IdentifierAuthorization,
    requestId: string,
    pkE: EcPublicJwk,
  ): Promise<GetRecoverySecretResponse> {
    return await this.#invoke(
      'getSecret',
      {
        identifierAuthorization: authorization,
        requestId,
        pkE,
      },
      parseGetSecretResponse,
    );
  }

  /**
   * @param mutation - Mutation to apply.
   * @param authControllerToken - Request-bound AuthController token.
   * @param identifierAuthorization - Identifier proof. `null` for register.
   * @param payload - Per-escrow mutation payload.
   * @returns The escrow's mutation receipt.
   */
  async applyMutation(
    mutation: Mutation,
    authControllerToken: AuthControllerToken,
    identifierAuthorization: IdentifierAuthorization | null,
    payload: MutationPayload,
  ): Promise<MutationReceipt> {
    return await this.#invoke(
      'applyMutation',
      {
        mutation,
        authControllerToken,
        identifierAuthorization,
        payload,
      },
      parseReceipt,
    );
  }

  /**
   * Verifies a receipt with the pinned receipt public key.
   *
   * @param receipt - Receipt returned by the escrow.
   * @param mutation - Mutation the receipt must acknowledge.
   * @param expectedEscrowId - Escrow identity expected by the caller.
   * @returns Whether the receipt is valid for this escrow.
   */
  verifyReceipt(
    receipt: MutationReceipt,
    mutation: Mutation,
    expectedEscrowId: string,
  ): boolean {
    if (
      receipt.mutationId !== mutation.id ||
      receipt.requestHash !== mutation.requestHash ||
      receipt.escrowId !== expectedEscrowId ||
      expectedEscrowId !== this.id ||
      receipt.version !== mutation.newVersion ||
      receipt.receiptKeyId !== wrapKeyId(this.#receiptPublicKey)
    ) {
      return false;
    }
    return verifySignature(
      this.#receiptPublicKey,
      receipt.signature,
      hashMutationReceipt({
        escrowId: receipt.escrowId,
        mutationId: receipt.mutationId,
        receiptKeyId: receipt.receiptKeyId,
        requestHash: receipt.requestHash,
        version: receipt.version,
      }),
    );
  }

  async #invoke<Result>(
    cmd: string,
    body: Record<string, unknown>,
    parse: (value: unknown) => Result,
  ): Promise<Result> {
    let policy: C2FResponse;
    let stdoutBytes: Uint8Array;
    try {
      const result = await this.#client.apiClient.policyInvoke(
        this.#functionId,
        this.#version,
        { request: { cmd, ...body } as JsonValue },
      );
      policy = result.response;
      stdoutBytes = hexToBytes(
        result.stdout.startsWith('0x')
          ? (result.stdout as Hex)
          : (`0x${result.stdout}` as Hex),
      );
    } catch (error) {
      throw new MfaRecoveryError(
        error instanceof Error ? error.message : 'Escrow request failed',
        'escrow_request_failed',
      );
    }
    if (policy.response !== 'Allow') {
      throw new MfaRecoveryError(
        policy.response === 'Deny' ? policy.reason : policy.error,
        'escrow_request_failed',
      );
    }
    let json: unknown;
    try {
      json = JSON.parse(new TextDecoder().decode(stdoutBytes));
    } catch {
      throw new MfaRecoveryError(
        'Escrow response was not JSON',
        'escrow_response_invalid',
      );
    }
    return parse(json);
  }
}

function parseChallenge(value: unknown): PoPChallenge {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    value.escrowId !== ESCROW_ID ||
    typeof value.expiresAt !== 'number' ||
    !Number.isInteger(value.expiresAt)
  ) {
    throw new MfaRecoveryError(
      'Invalid PoP challenge',
      'escrow_response_invalid',
    );
  }
  return {
    id: value.id,
    escrowId: value.escrowId,
    expiresAt: value.expiresAt,
  };
}

function parseGetSecretResponse(value: unknown): GetRecoverySecretResponse {
  if (
    !isRecord(value) ||
    !isRecord(value.recoverySecret) ||
    typeof value.recoverySecret.ciphertext !== 'string' ||
    typeof value.version !== 'number' ||
    !Number.isInteger(value.version) ||
    value.version < 0 ||
    typeof value.lastMutationId !== 'string' ||
    typeof value.wrapKeyId !== 'string'
  ) {
    throw new MfaRecoveryError(
      'Invalid recovery secret response',
      'escrow_response_invalid',
    );
  }
  return {
    recoverySecret: { ciphertext: value.recoverySecret.ciphertext },
    version: value.version,
    lastMutationId: value.lastMutationId,
    wrapKeyId: value.wrapKeyId,
  };
}

function parseReceipt(value: unknown): MutationReceipt {
  if (!isMutationReceipt(value)) {
    throw new MfaRecoveryError(
      'Invalid mutation receipt',
      'escrow_response_invalid',
    );
  }
  return value;
}

function isMutationReceipt(value: unknown): value is MutationReceipt {
  return (
    isRecord(value) &&
    typeof value.mutationId === 'string' &&
    typeof value.requestHash === 'string' &&
    typeof value.escrowId === 'string' &&
    typeof value.version === 'number' &&
    Number.isInteger(value.version) &&
    value.version >= 0 &&
    typeof value.receiptKeyId === 'string' &&
    typeof value.signature === 'string'
  );
}

/**
 * Unsigned mutation-receipt digest. SHA-256 of canonical JSON of the receipt
 * fields excluding `signature`.
 *
 * @param receipt - Receipt fields covered by the signature.
 * @returns Hex digest.
 */
function hashMutationReceipt(
  receipt: Omit<MutationReceipt, 'signature'>,
): string {
  return bytesToHex(sha256(stringToBytes(canonicalize(receipt))));
}

/**
 * Verifies a P-256 signature against a public key.
 *
 * @param publicKey - JWK JSON public key.
 * @param signature - Compact IEEE P1363 hex signature.
 * @param message - Message string; hashed with SHA-256 before ECDSA.
 * @returns Whether the signature is valid.
 */
function verifySignature(
  publicKey: string,
  signature: string,
  message: string,
): boolean {
  const jwk: unknown = JSON.parse(publicKey);
  if (
    !isRecord(jwk) ||
    typeof jwk.x !== 'string' ||
    typeof jwk.y !== 'string'
  ) {
    return false;
  }
  try {
    return p256.verify(
      hexToBytes(signature),
      sha256(stringToBytes(message)),
      concatBytes([
        new Uint8Array([0x04]),
        fromBase64Url(jwk.x),
        fromBase64Url(jwk.y),
      ]),
    );
  } catch {
    return false;
  }
}

/**
 * SHA-256 of the uncompressed P-256 public key, as `0x` hex.
 *
 * @param publicKey - Public JWK JSON.
 * @returns Key id matching cubist `wrapKeyId` / `receiptKeyId`.
 */
function wrapKeyId(publicKey: string): Hex {
  return bytesToHex(sha256(publicKeyBytesFromJwk(publicKey)));
}

function publicKeyBytesFromJwk(publicKey: string): Uint8Array {
  const jwk: unknown = JSON.parse(publicKey);
  if (
    !isRecord(jwk) ||
    jwk.kty !== 'EC' ||
    jwk.crv !== 'P-256' ||
    typeof jwk.x !== 'string' ||
    typeof jwk.y !== 'string'
  ) {
    throw new Error('Invalid P-256 public JWK');
  }
  return concatBytes([
    new Uint8Array([0x04]),
    fromBase64Url(jwk.x),
    fromBase64Url(jwk.y),
  ]);
}

function fromBase64Url(value: string): Uint8Array {
  return base64ToBytes(
    value
      .replace(/-/gu, '+')
      .replace(/_/gu, '/')
      .padEnd(value.length + ((4 - (value.length % 4)) % 4), '='),
  );
}

/**
 * Recursively sorts object keys so hashes are independent of property order.
 *
 * @param value - JSON-compatible value.
 * @returns A canonical JSON string.
 */
function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (value instanceof Uint8Array) {
    return bytesToHex(value);
  }
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys(value[key])]),
    );
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
