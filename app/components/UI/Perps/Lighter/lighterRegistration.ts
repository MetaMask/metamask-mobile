import type { LighterCreateClientParams } from '@metamask/perps-controller';
import {
  LIGHTER_MAINNET_CHAIN_ID,
  LIGHTER_TESTNET_CHAIN_ID,
} from '@metamask/perps-controller/constants/lighterConfig';

/** Validate public client metadata before key storage or registration approval. */
export function assertLighterClientParameters(
  params: LighterCreateClientParams,
): void {
  if (
    ![LIGHTER_TESTNET_CHAIN_ID, LIGHTER_MAINNET_CHAIN_ID].includes(
      params.chainId,
    ) ||
    ![params.accountIndex, params.apiKeyIndex, params.nonce].every(
      (value) => Number.isSafeInteger(value) && value >= 0,
    ) ||
    params.apiKeyIndex > 254
  ) {
    throw new Error('Invalid Lighter signer client parameters');
  }
}

/**
 * Permit only the protocol's registration plaintext for this client and key.
 * The pinned signer remains trusted for public-key derivation. Lighter's L1
 * plaintext has no chain field; the client key scope and L2 signature bind the
 * chain separately. This does not claim L1-message chain-domain separation.
 */
export function assertLighterRegistrationMessage(
  params: LighterCreateClientParams,
  result: {
    success: boolean;
    pubKeySuccess: boolean;
    pk: string;
    body: string;
  },
): void {
  assertLighterClientParameters(params);
  if (
    !result.success ||
    !result.pubKeySuccess ||
    !/^[0-9a-f]{80}$/u.test(result.pk)
  ) {
    throw new Error('Invalid Lighter registration public key');
  }
  const hex = (value: number) => value.toString(16).padStart(16, '0');
  const expected = [
    'Register Lighter Account',
    '',
    `pubkey: 0x${result.pk}`,
    `nonce: 0x${hex(params.nonce)}`,
    `account index: 0x${hex(params.accountIndex)}`,
    `api key index: 0x${hex(params.apiKeyIndex)}`,
    'Only sign this message for a trusted client!',
  ].join('\n');
  if (result.body !== expected) {
    throw new Error(
      'Lighter registration message does not match the requested client',
    );
  }
}
