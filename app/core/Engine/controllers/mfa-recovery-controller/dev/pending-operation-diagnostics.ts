import type {
  Identifier,
  PendingOperation,
  PendingOperationEncryptor,
  RecoveryApproval,
  RecoveryAuthProvider,
} from '@metamask/mfa-recovery-controller';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, stringToBytes } from '@metamask/utils';

// TEMPORARY DIAGNOSTIC: replays the controller's writing-phase pending
// operation checks, which otherwise all surface as invalid_pending_operation.
// Only check results, counts and identifier types are recorded; never tokens,
// identifier values or the recovery secret.

let lastPending: PendingOperation | undefined;
let lastApprovalDiagnostic: string | undefined;

/**
 * @returns The last approval check summary, if any.
 */
export function getLastApprovalDiagnostic(): string | undefined {
  return lastApprovalDiagnostic;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, node]) => node !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, node]) => `${JSON.stringify(key)}:${stableStringify(node)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

function hash(value: unknown): string {
  return bytesToHex(sha256(stringToBytes(stableStringify(value))));
}

interface TokenClaims {
  sub?: unknown;
  exp?: unknown;
  ext?: {
    aal?: unknown;
    request_hash?: unknown;
    identifiers_hash?: unknown;
  };
}

function decodeClaims(token: string): TokenClaims | undefined {
  try {
    const segment = (token.split('.')[1] ?? '')
      .replace(/-/gu, '+')
      .replace(/_/gu, '/');
    const padded = segment.padEnd(Math.ceil(segment.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return undefined;
  }
}

function describeApproval(
  requestHash: string,
  { approval, identifiers }: RecoveryApproval,
): string {
  const claims = decodeClaims(approval);
  const ext = claims?.ext;
  const mutation = lastPending?.mutation;
  const payload = lastPending?.payload as
    | { identifiers?: Identifier[] }
    | undefined;
  const approvedHashes = new Set(identifiers.map(hash));
  const unapproved = (payload?.identifiers ?? [])
    .filter(({ type }) => type !== 'siwe')
    .filter((identifier) => !approvedHashes.has(hash(identifier)))
    .map((identifier) => {
      const sameValue = identifiers.some(
        (approved) =>
          approved.type === identifier.type &&
          approved.value === identifier.value,
      );
      return `${identifier.type}${sameValue ? '(verifier differs)' : ''}`;
    });

  return [
    `claims=${claims === undefined ? 'undecodable' : 'ok'}`,
    `aal=${String(ext?.aal)}`,
    `requestHash=${ext?.request_hash === requestHash ? 'ok' : 'MISMATCH'}`,
    `pendingRequestHash=${
      mutation === undefined
        ? 'none'
        : mutation.requestHash === requestHash
          ? 'ok'
          : 'MISMATCH'
    }`,
    `sub=${
      mutation === undefined
        ? 'unknown'
        : claims?.sub === mutation.profileId
          ? 'ok'
          : 'MISMATCH'
    }`,
    `approvedIdentifiers=${identifiers.length}[${identifiers
      .map(({ type }) => type)
      .join(',')}]`,
    `identifiersHash=${
      ext?.identifiers_hash === undefined
        ? 'absent'
        : ext.identifiers_hash === hash(identifiers)
          ? 'ok'
          : 'MISMATCH'
    }`,
    `unapproved=[${unapproved.join(',')}]`,
  ].join(' ');
}

/**
 * @param encryptor - Encryptor whose encrypted operations are captured.
 * @returns The encryptor, recording the last operation it encrypted.
 */
export function withPendingCapture(
  encryptor: PendingOperationEncryptor,
): PendingOperationEncryptor {
  return {
    encrypt: async (operation) => {
      lastPending = operation;
      return await encryptor.encrypt(operation);
    },
    decrypt: async (ciphertext) => {
      const operation = await encryptor.decrypt(ciphertext);
      lastPending = operation;
      return operation;
    },
  };
}

/**
 * @param authProvider - Auth provider whose approvals are checked.
 * @returns The auth provider, recording a check summary for each approval.
 */
export function withApprovalDiagnostics(
  authProvider: RecoveryAuthProvider,
): RecoveryAuthProvider {
  return {
    getAuthenticatedProfileId: async () =>
      await authProvider.getAuthenticatedProfileId(),
    authorizeRecoveryRequest: async (params) => {
      const result = await authProvider.authorizeRecoveryRequest(params);
      try {
        lastApprovalDiagnostic = describeApproval(params.requestHash, result);
      } catch (error) {
        lastApprovalDiagnostic = `diagnostic failed: ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
      console.warn('MFA recovery approval check', lastApprovalDiagnostic);
      return result;
    },
  };
}
