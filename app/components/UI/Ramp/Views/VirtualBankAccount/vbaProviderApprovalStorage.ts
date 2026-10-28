import StorageWrapper from '../../../../../store/storage-wrapper';

const VBA_PROVIDER_APPROVAL_VERSION = 'v1';
const VBA_PROVIDER_APPROVAL_PREFIX = `@MetaMask:vbaProviderApprovalPending:${VBA_PROVIDER_APPROVAL_VERSION}`;

const getStorageKey = (walletAddress: string): string =>
  `${VBA_PROVIDER_APPROVAL_PREFIX}:${walletAddress.toLowerCase()}`;

/**
 * Whether account setup last stopped because the provider (MoonPay) had not
 * activated the customer yet. Neither controller persists that, so Money home
 * reads this to show the pending-approval card.
 */
export const isVbaProviderApprovalPending = async (
  walletAddress: string,
): Promise<boolean> =>
  (await StorageWrapper.getItem(getStorageKey(walletAddress))) === 'true';

export const markVbaProviderApprovalPending = async (
  walletAddress: string,
): Promise<void> => {
  await StorageWrapper.setItem(getStorageKey(walletAddress), 'true');
};

export const clearVbaProviderApprovalPending = async (
  walletAddress: string,
): Promise<void> => {
  await StorageWrapper.removeItem(getStorageKey(walletAddress));
};
