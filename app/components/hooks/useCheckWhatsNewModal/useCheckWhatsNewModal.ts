import { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { shouldShowWhatsNewModal } from '../../../util/onboarding';
import Routes from '../../../constants/navigation/Routes';

/**
 * Hook to check and show WhatsNewModal when appropriate
 *
 * This hook:
 * - Checks if the WhatsNewModal should be shown based on app version and user state
 * - Automatically navigates to the modal if conditions are met
 * - Follows the same pattern as other modal hooks (NFT auto-detection, multi-RPC, etc.)
 */
const useCheckWhatsNewModal = () => {
  const navigation = useNavigation();

  const checkAndShowWhatsNewModal = useCallback(async () => {
    try {
      const shouldShow = await shouldShowWhatsNewModal();

      if (shouldShow) {
        navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
          screen: Routes.MODAL.WHATS_NEW,
        });
      }
    } catch (error) {
      // Silently fail if there's an error checking the modal state
      // This prevents the app from crashing if there are storage issues
      console.warn('Error checking WhatsNewModal state:', error);
    }
  }, [navigation]);

  useEffect(() => {
    checkAndShowWhatsNewModal();
  }, [checkAndShowWhatsNewModal]);
};

export default useCheckWhatsNewModal;
