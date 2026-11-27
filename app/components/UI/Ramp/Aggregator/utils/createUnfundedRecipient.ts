import { toChecksumHexAddress } from '@metamask/controller-utils';
import { bytesToHex, Hex } from '@metamask/utils';

/**
 * Creates a random, never-funded EVM address used only as the recipient of a
 * pre-quote gas estimate.
 *
 * @returns A checksummed random address.
 */
export function createUnfundedRecipient(): Hex {
  // Random per screen mount so nobody can pre-fund it and hide the EIP-2780
  // new-account charge. It is never a destination.
  const bytes = new Uint8Array(20);
  globalThis.crypto.getRandomValues(bytes);

  return toChecksumHexAddress(bytesToHex(bytes)) as Hex;
}
