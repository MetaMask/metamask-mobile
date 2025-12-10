import { NETWORKS_CHAIN_ID } from '../../constants/network';
import { isE2E } from '../test/utils';

export function stripSingleLeadingZero(hex: string): string {
  if (!hex.startsWith('0x0') || hex.length <= 3) {
    return hex;
  }
  return `0x${hex.slice(3)}`;
}

export function isE2ETest(chainId: string): boolean {
  return isE2E && chainId === NETWORKS_CHAIN_ID.LOCALHOST;
}
