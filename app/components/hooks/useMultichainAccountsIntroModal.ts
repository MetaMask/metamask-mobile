import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectMultichainAccountsState2Enabled } from '../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import { selectMultichainAccountsIntroModalSeen } from '../../reducers/user/selectors';
import Routes from '../../constants/navigation/Routes';

/**
 * Hook to handle showing the multichain accounts intro modal
 * Shows the modal only when:
 * 1. Multichain accounts state 2 is enabled
 * 2. The modal hasn't been seen before
 */
export const useMultichainAccountsIntroModal = () => {
  const navigation = useNavigation();

  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const hasSeenIntroModal = useSelector(selectMultichainAccountsIntroModalSeen);

  useEffect(() => {
    // Only show modal if state 2 is enabled and user hasn't seen it
    if (isMultichainAccountsState2Enabled && !hasSeenIntroModal) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.MULTICHAIN_ACCOUNTS_INTRO,
      });
    }
  }, [isMultichainAccountsState2Enabled, hasSeenIntroModal, navigation]);

  return {
    isMultichainAccountsState2Enabled,
    hasSeenIntroModal,
  };
};
