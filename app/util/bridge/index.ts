import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../constants/bridge';

export function isSwapsNativeAsset(token: { address: string } | undefined) {
  return Boolean(token) && token?.address === NATIVE_SWAPS_TOKEN_ADDRESS;
}
