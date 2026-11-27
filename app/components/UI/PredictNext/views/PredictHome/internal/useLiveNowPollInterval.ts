import {
  useNetworkTier,
  type NetworkTier,
} from '../../../../../../hooks/useNetworkTier';

/** How often Live now reads its sources again, so a finished Game leaves and
 * a new one joins within a minute. */
export const LIVE_NOW_POLL_MS = 60_000;
/** The rare poll the device-capability matrix asks for on a 2G or 3G link. */
export const LIVE_NOW_SLOW_POLL_MS = 300_000;

/**
 * Live now's poll period on `networkTier`, or undefined for no poll. Without
 * a network nothing is read. An unknown tier polls at the product default.
 * The hardware tier does not change the period: the matrix asks low-end
 * devices for short lists, which Home's read sizes already give them.
 */
export const getLiveNowPollInterval = (
  networkTier: NetworkTier | null,
): number | undefined => {
  switch (networkTier) {
    case 'NONE':
      return undefined;
    case 'SLOW_CELLULAR':
      return LIVE_NOW_SLOW_POLL_MS;
    default:
      return LIVE_NOW_POLL_MS;
  }
};

/**
 * Live now's poll period while Home is the focused screen; undefined under
 * another screen. React Query also pauses the poll while the app is in the
 * background.
 */
export const useLiveNowPollInterval = (
  isFocused: boolean,
): number | undefined => {
  const networkTier = useNetworkTier();
  return isFocused ? getLiveNowPollInterval(networkTier) : undefined;
};
