import {
  KnownCaipNamespace,
  toCaipChainId,
  hexToNumber,
  isCaipChainId,
  isStrictHexString,
  isValidHexAddress,
  parseCaipAssetType,
  getChecksumAddress,
} from '@metamask/utils';
import { toAssetId } from '../../../Bridge/hooks/useAssetMetadata/utils';

export const getFallbackAssetImageUrls = (
  chainId: string | undefined,
  address: string,
) => {
  if (!chainId) {
    return undefined;
  }

  if (!isCaipChainId(chainId) && !isStrictHexString(chainId)) {
    return undefined;
  }

  const caipChainId = isStrictHexString(chainId)
    ? toCaipChainId(KnownCaipNamespace.Eip155, hexToNumber(chainId).toString())
    : chainId;

  const caipAssetId = toAssetId(address, caipChainId);

  if (!caipAssetId) {
    return undefined;
  }

  const {
    chain: { namespace, reference },
    assetNamespace,
    assetReference,
  } = parseCaipAssetType(caipAssetId);
  const hexAssetReference = assetReference as `0x${string}`;
  const checkSummedAddress = isValidHexAddress(hexAssetReference)
    ? getChecksumAddress(hexAssetReference)
    : assetReference;
  const lowercasedAddress = assetReference.toLowerCase();
  return [
    `https://static.cx.metamask.io/api/v2/tokenIcons/assets/${namespace}/${reference}/${assetNamespace}/${lowercasedAddress}.png`,
    `https://static.cx.metamask.io/api/v2/tokenIcons/assets/${namespace}/${reference}/${assetNamespace}/${checkSummedAddress}.png`,
  ];
};

export function createRotatingSet<T>(maxSize: number = 100): {
  add(value: T): void;
  has(value: T): boolean;
  value: Set<T>;
} {
  const set = new Set<T>();
  return {
    add(value: T): void {
      set.add(value);
      if (set.size > maxSize) {
        set.delete(set.values().next().value);
      }
    },
    has(value: T): boolean {
      return set.has(value);
    },
    value: set,
  };
}
