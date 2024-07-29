/* eslint-disable import/prefer-default-export */
import compareVersions from 'compare-versions';
import {
  WHATS_NEW_APP_VERSION_SEEN,
  CURRENT_APP_VERSION,
  LAST_APP_VERSION,
} from '../../constants/storage';
import { whatsNewList } from '../../components/UI/WhatsNewModal';
import StorageWrapper from '../../store/storage-wrapper';
import { NETWORKS_CHAIN_ID } from '../../constants/network';
import { store } from '../../store';

const isVersionSeenAndGreaterThanMinAppVersion = (
  versionSeen: string | null,
  minAppVersion: string,
) => !!versionSeen && compareVersions.compare(versionSeen, minAppVersion, '>=');

const STX_OPT_IN_MIN_APP_VERSION = '7.24.0';

/**
 *
 * @param chainId The chainId of the current network
 * @param providerConfigRpcUrl The RPC URL of the current network
 * @returns Boolean indicating whether or not to show smart transactions opt in modal
 */
export const shouldShowSmartTransactionsOptInModal = async (
  chainId: string,
  providerConfigRpcUrl: string | undefined,
  accountHasZeroBalance: boolean,
) => {
  if (
    process.env.IS_TEST === 'true' ||
    chainId !== NETWORKS_CHAIN_ID.MAINNET ||
    providerConfigRpcUrl !== undefined || // undefined is the default RPC URL (Infura).
    accountHasZeroBalance
  ) {
    return false;
  }

  const versionSeen =
    store.getState().smartTransactions.optInModalAppVersionSeen;

  const currentAppVersion = await StorageWrapper.getItem(CURRENT_APP_VERSION);

  // Check if user has seen
  const seen = isVersionSeenAndGreaterThanMinAppVersion(
    versionSeen,
    STX_OPT_IN_MIN_APP_VERSION,
  );

  if (seen) return false;

  // Check version
  const versionCorrect = compareVersions.compare(
    currentAppVersion as string,
    STX_OPT_IN_MIN_APP_VERSION,
    '>=',
  );

  return versionCorrect;
};

/**
 * Returns boolean indicating whether or not to show whats new modal
 *
 * @returns Boolean indicating whether or not to show whats new modal
 */
export const shouldShowWhatsNewModal = async () => {
  const whatsNewAppVersionSeen = await StorageWrapper.getItem(
    WHATS_NEW_APP_VERSION_SEEN,
  );

  const currentAppVersion = await StorageWrapper.getItem(CURRENT_APP_VERSION);
  const lastAppVersion = await StorageWrapper.getItem(LAST_APP_VERSION);
  const isUpdate = !!lastAppVersion && currentAppVersion !== lastAppVersion;

  const seen = isVersionSeenAndGreaterThanMinAppVersion(
    whatsNewAppVersionSeen,
    whatsNewList.minAppVersion,
  );

  if (seen) return false;

  if (whatsNewList.onlyUpdates) {
    const updatingCorrect = whatsNewList.onlyUpdates && isUpdate;

    if (!updatingCorrect) return false;

    const lastVersionCorrect = compareVersions.compare(
      lastAppVersion,
      whatsNewList.maxLastAppVersion,
      '<',
    );

    if (!lastVersionCorrect) return false;
  }

  const versionCorrect = compareVersions.compare(
    currentAppVersion as string,
    whatsNewList.minAppVersion,
    '>=',
  );

  if (!versionCorrect) return false;

  if (whatsNewList.slides.length) {
    // Show whats new
    return true;
  }
  return false;
};
