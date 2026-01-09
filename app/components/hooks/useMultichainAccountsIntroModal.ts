import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectMultichainAccountsIntroModalSeen } from '../../reducers/user/selectors';
import Routes from '../../constants/navigation/Routes';
import { useNavigation } from '../../util/navigation/navUtils';
import StorageWrapper from '../../store/storage-wrapper';
import { CURRENT_APP_VERSION, LAST_APP_VERSION } from '../../constants/storage';

const isE2ETest =
  process.env.IS_TEST === 'true' || process.env.METAMASK_ENVIRONMENT === 'e2e';

/**
 * Hook to handle showing the multichain accounts intro modal
 * Shows the modal only when:
 * 1. Multichain accounts state 2 is enabled
 * 2. The modal hasn't been seen before
 * 3. This is not a fresh install (app update)
 */
export const useMultichainAccountsIntroModal = () => {
  const navigation = useNavigation();

  const hasSeenIntroModal = useSelector(selectMultichainAccountsIntroModalSeen);

  const checkAndShowMultichainAccountsIntroModal = useCallback(async () => {
    // Check if this is a fresh install
    const currentAppVersion = await StorageWrapper.getItem(CURRENT_APP_VERSION);
    const lastAppVersion = await StorageWrapper.getItem(LAST_APP_VERSION);
    const isUpdate = !!lastAppVersion && currentAppVersion !== lastAppVersion;

    let isMultichainAccountsUpdate = false;
    if (isUpdate) {
      const toParts = (v: string = '') => v.split('.').map(Number);
      const [lastMaj = 0, lastMin = 0] = toParts(lastAppVersion);
      const [currMaj = 0, currMin = 0] = toParts(currentAppVersion);

      isMultichainAccountsUpdate =
        (lastMaj < 7 || (lastMaj === 7 && lastMin <= 56)) &&
        (currMaj > 7 || (currMaj === 7 && currMin >= 57));
    }

    // Only show modal if:
    // 1. Feature is enabled
    // 2. User hasn't seen the modal
    // 3. This is not a fresh install (it's an update)
    const shouldShow =
      !hasSeenIntroModal && isUpdate && isMultichainAccountsUpdate;

    if (shouldShow && !isE2ETest) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.MULTICHAIN_ACCOUNTS_INTRO,
      });
    }
  }, [hasSeenIntroModal, navigation]);

  useEffect(() => {
    checkAndShowMultichainAccountsIntroModal();
  }, [checkAndShowMultichainAccountsIntroModal]);

  return {
    hasSeenIntroModal,
  };
};
