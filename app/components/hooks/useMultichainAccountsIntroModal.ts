import { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectMultichainAccountsState2Enabled } from '../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import { selectMultichainAccountsIntroModalSeen } from '../../reducers/user/selectors';
import Routes from '../../constants/navigation/Routes';
import StorageWrapper from '../../store/storage-wrapper';
import { CURRENT_APP_VERSION, LAST_APP_VERSION } from '../../constants/storage';

/**
 * Hook to handle showing the multichain accounts intro modal
 * Shows the modal only when:
 * 1. Multichain accounts state 2 is enabled
 * 2. The modal hasn't been seen before
 * 3. This is not a fresh install (app update)
 */
export const useMultichainAccountsIntroModal = () => {
  const navigation = useNavigation();

  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const hasSeenIntroModal = useSelector(selectMultichainAccountsIntroModalSeen);

  const checkAndShowMultichainAccountsIntroModal = useCallback(async () => {
    // Check if this is a fresh install
    const currentAppVersion = await StorageWrapper.getItem(CURRENT_APP_VERSION);
    const lastAppVersion = await StorageWrapper.getItem(LAST_APP_VERSION);
    const isUpdate = !!lastAppVersion && currentAppVersion !== lastAppVersion;

    // Only show modal if:
    // 1. Feature is enabled
    // 2. User hasn't seen the modal
    // 3. This is not a fresh install (it's an update)
    const shouldShow =
      isMultichainAccountsState2Enabled && !hasSeenIntroModal && isUpdate;

    if (shouldShow) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.MULTICHAIN_ACCOUNTS_INTRO,
      });
    }
  }, [isMultichainAccountsState2Enabled, hasSeenIntroModal, navigation]);

  useEffect(() => {
    checkAndShowMultichainAccountsIntroModal();
  }, [checkAndShowMultichainAccountsIntroModal]);

  return {
    isMultichainAccountsState2Enabled,
    hasSeenIntroModal,
  };
};
