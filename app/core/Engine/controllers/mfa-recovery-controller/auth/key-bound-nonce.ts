import { bytesToHex, sha256, stringToBytes } from '@metamask/utils';

/**
 * The digest the escrow expects an identifier proof to commit to: the hash of
 * the proof public key and the request hash.
 *
 * @param proofPublicKey - The controller's ephemeral proof key.
 * @param requestHash - The hash of the request being authorized.
 * @returns The digest bytes.
 */
export async function keyBoundDigest(
  proofPublicKey: Uint8Array,
  requestHash: string,
): Promise<Uint8Array> {
  return await sha256(
    stringToBytes(JSON.stringify([bytesToHex(proofPublicKey), requestHash])),
  );
}
