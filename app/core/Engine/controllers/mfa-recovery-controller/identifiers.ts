import { base64ToBytes, bytesToString } from '@metamask/utils';
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
