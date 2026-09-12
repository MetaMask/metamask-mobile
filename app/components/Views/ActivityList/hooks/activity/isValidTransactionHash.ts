import { isStrictHexString } from '@metamask/utils';

export function isValidTransactionHash(hash: string) {
  return hash.length === 66 && isStrictHexString(hash);
}
