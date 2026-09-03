import { Hex, CaipAssetType, isCaipAssetType } from '@metamask/utils';
import { getDecimalChainId } from '../../../../util/networks';
import { TokenI } from '../../Tokens/types';
import { getCaipAssetIdForToken } from '../../Tokens/util/getCaipAssetIdForToken';
import parseRampIntent from './parseRampIntent';

/**
 * Token fields needed to resolve a Buy / ramp CAIP-19 asset id.
 */
export type ResolveBuyAssetIdInput = TokenI & {
  /** Preferred CAIP-19 when already resolved (e.g. Asset route params). */
  caipAssetId?: CaipAssetType;
};

/**
 * Resolves the CAIP-19 asset id for Buy / ramp navigation.
 * Prefers an explicit caipAssetId, then Tokens-domain native/ERC-20 resolution
 * (`getCaipAssetIdForToken`), then legacy address+chain parseRampIntent.
 */
export async function resolveBuyAssetId(
  token: ResolveBuyAssetIdInput,
): Promise<string | undefined> {
  try {
    if (token.caipAssetId && isCaipAssetType(token.caipAssetId)) {
      return token.caipAssetId;
    }

    const fromTokenModel = await getCaipAssetIdForToken(token);
    if (fromTokenModel) {
      return fromTokenModel;
    }

    if (isCaipAssetType(token.address)) {
      return token.address;
    }

    return parseRampIntent({
      chainId: getDecimalChainId(token.chainId as Hex),
      address: token.address,
    })?.assetId;
  } catch {
    return undefined;
  }
}

export default resolveBuyAssetId;
