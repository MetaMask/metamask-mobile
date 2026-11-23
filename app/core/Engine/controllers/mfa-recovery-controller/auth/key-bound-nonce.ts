import { bytesToHex, sha256, stringToBytes } from '@metamask/utils';

/**
 * The digest the escrow expects an identifier proof to commit to: the hash of
 * the proof public key, the request hash, and the token expiry.
 *
 * @param proofPublicKey - The controller's ephemeral proof key.
 * @param requestHash - The hash of the request being authorized.
 * @param notAfter - Unix seconds after which escrows reject the token.
 * @returns The digest bytes.
 */
export async function keyBoundDigest(
  proofPublicKey: Uint8Array,
  requestHash: string,
  notAfter: number,
): Promise<Uint8Array> {
  return await sha256(
    stringToBytes(
      JSON.stringify([bytesToHex(proofPublicKey), requestHash, notAfter]),
    ),
  );
}
