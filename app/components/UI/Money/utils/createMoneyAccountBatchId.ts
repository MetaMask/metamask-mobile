import { bytesToHex, type Hex } from '@metamask/utils';
import { v4 as uuidv4, parse as uuidParse } from 'uuid';

/**
 * Creates a 16-byte hex identifier for a Money Account transaction batch.
 *
 * @returns A `0x`-prefixed, 32-character hex string.
 */
export function createMoneyAccountBatchId(): Hex {
  return bytesToHex(new Uint8Array(uuidParse(uuidv4())));
}
