import { useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { shouldShowWhatsNewModal } from '../../../util/onboarding';
import Routes from '../../../constants/navigation/Routes';
import { useSelector } from 'react-redux';
import { selectSolanaOnboardingModalEnabled } from '../../../selectors/multichain/multichain';
import StorageWrapper from '../../../store/storage-wrapper';
import { SOLANA_FEATURE_MODAL_SHOWN } from '../../../constants/storage';
/**
 * Hook to check and show WhatsNewModal when appropriate
 *
 * This hook:
 * - Checks if the WhatsNewModal should be shown based on app version and user state
 * - Automatically navigates to the modal if conditions are met
 * - Follows the same pattern as other modal hooks (NFT auto-detection, multi-RPC, etc.)
 * - Temporarily added solana check for 7.55 RC
 */
const useCheckWhatsNewModal = () => {
  const navigation = useNavigation();
  const solanaOnboardingModalEnabled = useSelector(
    selectSolanaOnboardingModalEnabled,
  );

  const checkAndShowWhatsNewModal = useCallback(async () => {
    try {
      // If Solana onboarding is enabled, check if the modal has been shown
      if (solanaOnboardingModalEnabled) {
        const hasSeenModal = await StorageWrapper.getItem(
          SOLANA_FEATURE_MODAL_SHOWN,
        );

        // Only show What's New modal if Solana modal has already been shown
        if (hasSeenModal !== 'true') {
          return; // Don't show What's New modal yet
        }
      }

      // Show What's New modal if:
      // 1. Solana onboarding is disabled, OR
      // 2. Solana onboarding is enabled AND the modal has been shown
      const shouldShow = await shouldShowWhatsNewModal();
      if (shouldShow) {
        navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
          screen: Routes.MODAL.WHATS_NEW,
        });
      }
    } catch (error) {
      console.warn('Error checking WhatsNewModal state:', error);
    }
  }, [navigation, solanaOnboardingModalEnabled]);

  useFocusEffect(
    useCallback(() => {
      checkAndShowWhatsNewModal();
    }, [checkAndShowWhatsNewModal]),
  );
};

export default useCheckWhatsNewModal;
