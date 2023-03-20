/* eslint-disable import/prefer-default-export */
import { MMKVStorage } from '../../core/Storage';
import compareVersions from 'compare-versions';
import {
  WHATS_NEW_APP_VERSION_SEEN,
  CURRENT_APP_VERSION,
  LAST_APP_VERSION,
} from '../../constants/storage';
import { whatsNewList } from '../../components/UI/WhatsNewModal';

/**
 * Returns boolean indicating whether or not to show whats new modal
 *
 * @returns Boolean indicating whether or not to show whats new modal
 */
export const shouldShowWhatsNewModal = async () => {
  const whatsNewAppVersionSeen = await MMKVStorage.getString(
    WHATS_NEW_APP_VERSION_SEEN,
  );

  const currentAppVersion = await MMKVStorage.getString(CURRENT_APP_VERSION);
  const lastAppVersion = await MMKVStorage.getString(LAST_APP_VERSION);
  const isUpdate = !!lastAppVersion && currentAppVersion !== lastAppVersion;

  const seen =
    !!whatsNewAppVersionSeen &&
    compareVersions.compare(
      whatsNewAppVersionSeen,
      whatsNewList.minAppVersion,
      '>=',
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
