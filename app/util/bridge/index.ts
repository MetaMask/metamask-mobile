import { NATIVE_SWAPS_TOKEN_ADDRESS } from '@metamask/swaps-controller/dist/constants';

export function isSwapsNativeAsset(token: { address: string } | undefined) {
  return Boolean(token) && token?.address === NATIVE_SWAPS_TOKEN_ADDRESS;
}
