import { Hex, isCaipChainId } from '@metamask/utils';
import {
  isTestNet,
  getTestNetImageByChainId,
  getDefaultNetworkByChainId,
} from '../../../../util/networks';
import {
  UnpopularNetworkList,
  CustomNetworkImgMapping,
  PopularList,
  getNonEvmNetworkImageSourceByChainId,
} from '../../../../util/networks/customNetworks';

/**
 * Badge sources are derived from static network lists, so the result for a
 * given chain ID never changes within a session. The uncached lookup scans
 * `UnpopularNetworkList` and `PopularList` linearly, which is significant when
 * called once per asset per render pass, so results are memoised lazily.
 */
const badgeSourceCache = new Map<
  Hex,
  ReturnType<typeof computeNetworkBadgeSource>
>();

export function getNetworkBadgeSource(chainId: Hex) {
  // `has` rather than a truthiness check: an unknown chain ID resolves to
  // `undefined`, which must still be cached to avoid rescanning every time.
  if (badgeSourceCache.has(chainId)) {
    return badgeSourceCache.get(chainId);
  }

  const badgeSource = computeNetworkBadgeSource(chainId);
  badgeSourceCache.set(chainId, badgeSource);

  return badgeSource;
}

/**
 * Clears the memoised badge sources. Only needed by tests, which re-mock the
 * underlying network lookups for a chain ID the cache has already seen.
 */
export function resetNetworkBadgeSourceCache() {
  badgeSourceCache.clear();
}

function computeNetworkBadgeSource(chainId: Hex) {
  if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);
  const defaultNetwork = getDefaultNetworkByChainId(chainId) as
    | {
        imageSource: string;
      }
    | undefined;

  if (defaultNetwork) {
    return defaultNetwork.imageSource;
  }

  const unpopularNetwork = UnpopularNetworkList.find(
    (networkConfig) => networkConfig.chainId === chainId,
  );

  const customNetworkImg = CustomNetworkImgMapping[chainId];

  const popularNetwork = PopularList.find(
    (networkConfig) => networkConfig.chainId === chainId,
  );

  const network = unpopularNetwork || popularNetwork;
  if (network) {
    return network.rpcPrefs.imageSource;
  }
  if (isCaipChainId(chainId)) {
    return getNonEvmNetworkImageSourceByChainId(chainId);
  }
  if (customNetworkImg) {
    return customNetworkImg;
  }
}
