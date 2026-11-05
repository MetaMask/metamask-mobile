import StorageWrapper from '../../../../../store/storage-wrapper';

const VBA_ACCOUNT_DETAILS_VIEWED_VERSION = 'v1';
const VBA_ACCOUNT_DETAILS_VIEWED_PREFIX = `@MetaMask:vbaAccountDetailsViewed:${VBA_ACCOUNT_DETAILS_VIEWED_VERSION}`;
const VIEWED_VALUE = 'true';

type ViewedListener = (walletAddress: string) => void;

const listeners = new Set<ViewedListener>();

const normalize = (walletAddress: string): string =>
  walletAddress.toLowerCase();

const getStorageKey = (walletAddress: string): string =>
  `${VBA_ACCOUNT_DETAILS_VIEWED_PREFIX}:${normalize(walletAddress)}`;

/**
 * Whether the account details screen has shown this wallet's deposit details
 * at least once on this device.
 *
 * @param walletAddress - Money account wallet the flag is stored under.
 * @returns `true` once details were shown for that wallet.
 */
export const hasViewedVbaAccountDetails = async (
  walletAddress: string,
): Promise<boolean> =>
  (await StorageWrapper.getItem(getStorageKey(walletAddress))) === VIEWED_VALUE;

/**
 * Records that this wallet's deposit details were shown, then tells any
 * subscriber (Money home's card hook) so it can update without a re-read.
 *
 * @param walletAddress - Money account wallet the details belong to.
 */
export const markVbaAccountDetailsViewed = async (
  walletAddress: string,
): Promise<void> => {
  await StorageWrapper.setItem(getStorageKey(walletAddress), VIEWED_VALUE);
  const normalized = normalize(walletAddress);
  listeners.forEach((listener) => listener(normalized));
};

/**
 * Subscribes to {@link markVbaAccountDetailsViewed}. The listener receives the
 * lower-cased wallet address.
 *
 * @param listener - Called after a wallet's flag is saved.
 * @returns Unsubscribe.
 */
export const subscribeVbaAccountDetailsViewed = (
  listener: ViewedListener,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
