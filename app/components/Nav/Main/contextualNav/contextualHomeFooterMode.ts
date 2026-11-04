import Routes from '../../../../constants/navigation/Routes';
import type {
  HardwareTier,
  NetworkTier,
} from '../../../../util/deviceCapability/types';

export type HomeFooterMode = 'home' | 'money';

/**
 * Which footer the active home tab shows. Money swaps in place.
 * Trending keeps the default footer.
 */
export const getHomeFooterMode = (
  routeName: string | undefined,
): HomeFooterMode => {
  if (routeName === Routes.MONEY.ROOT) {
    return 'money';
  }
  return 'home';
};

/**
 * In-place fade for the Money and Explore footer.
 *
 * LOW hardware skips it on every network. `null` hardware is unknown and
 * keeps the fade. `null` network is unknown and is not treated as offline.
 * `NONE` still fades: the fade does not fetch, prefetch, or add blur.
 */
export const shouldFadeHomeFooter = (
  hardware: HardwareTier | null,
  network: NetworkTier | null,
): boolean => {
  if (hardware === 'LOW') {
    return false;
  }

  switch (network) {
    case 'NONE':
    case 'SLOW_CELLULAR':
    case 'FAST_CELLULAR':
    case 'WIFI':
    case null:
      return true;
    default:
      return true;
  }
};
