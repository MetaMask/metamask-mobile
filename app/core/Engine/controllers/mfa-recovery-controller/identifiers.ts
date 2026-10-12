import {
  base64ToBytes,
  bytesToHex,
  bytesToString,
  sha256,
  stringToBytes,
} from '@metamask/utils';
import type { Identifier } from '@metamask/mfa-recovery-controller';
import { SIWE_CHAIN_ID, SIWE_DOMAIN } from './constants';

export type SignPersonalMessage = (params: {
  data: string;
  from: string;
}) => Promise<string>;

/** Creates the canonical SIWE identifier for a wallet address. */
export function createSiweIdentifier(address: string): Identifier {
  return {
    type: 'siwe',
    namespace: `${SIWE_DOMAIN}:${SIWE_CHAIN_ID}`,
    value: address.toLowerCase(),
    verifier: { domain: SIWE_DOMAIN, chainId: SIWE_CHAIN_ID },
  };
}

/** Hashes identifiers in the canonical order used by the token service. */
export async function hashIdentifiers(
  identifiers: Identifier[],
): Promise<string> {
  const canonicalIdentifiers = identifiers
    .map((identifier) => ({
      namespace: identifier.namespace,
      type: identifier.type,
      value: identifier.value,
      verifier: identifier.verifier,
    }))
    .sort((left, right) =>
      compareUtf8(canonicalize(left), canonicalize(right)),
    );

  return bytesToHex(
    await sha256(stringToBytes(canonicalize(canonicalIdentifiers))),
  );
}

/** Extracts the authenticated profile ID from a compact JWT. */
export function getJwtSubject(accessToken: string): string {
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

function compareUtf8(left: string, right: string): number {
  const leftBytes = stringToBytes(left);
  const rightBytes = stringToBytes(right);
  const sharedLength = Math.min(leftBytes.length, rightBytes.length);

  for (let index = 0; index < sharedLength; index++) {
    const difference = (leftBytes[index] ?? 0) - (rightBytes[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }

  return leftBytes.length - rightBytes.length;
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
