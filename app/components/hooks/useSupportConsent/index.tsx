import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import getSupportUrl from '../../../util/support';
import Routes from '../../../constants/navigation/Routes';
import {
  selectShouldShowConsentSheet,
  selectDataSharingPreference,
} from '../../../selectors/security';

interface UseSupportConsentReturn {
  openSupportWebPage: () => void;
  handleConsent: () => Promise<void>;
  handleDecline: () => Promise<void>;
}

/**
 * Custom hook to manage support consent flow
 * @param onNavigate - Callback to navigate to the support URL with title
 * @param title - Title for the support page
 * @param buildType - (optional) Build type, for testability. Defaults to process.env.METAMASK_BUILD_TYPE
 * @returns Object with consent sheet state and handlers
 */
export const useSupportConsent = (
  onNavigate: (url: string, title: string) => void,
  title: string,
  buildType?: string,
): UseSupportConsentReturn => {
  const navigation = useNavigation();
  const shouldShowConsentSheet = useSelector(selectShouldShowConsentSheet);
  const dataSharingPreference = useSelector(selectDataSharingPreference);


  const handleConsent = useCallback(async () => {
    try {
      const supportUrl = await getSupportUrl(true);
      onNavigate(supportUrl, title);
    } catch (error) {
      console.warn('Error getting support URL with consent:', error);
      // Fallback to base URL
      const supportUrl = await getSupportUrl(false);
      onNavigate(supportUrl, title);
    }
  }, [onNavigate, title]);

  const handleDecline = useCallback(async () => {
    try {
      const supportUrl = await getSupportUrl(false);
      onNavigate(supportUrl, title);
    } catch (error) {
      console.warn('Error getting support URL without consent:', error);
      // Fallback to base URL
      const fallbackUrl = 'https://support.metamask.io';
      onNavigate(fallbackUrl, title);
    }
  }, [onNavigate, title]);

  const openSupportWebPage = useCallback(() => {
    // For beta builds, bypass consent flow and go directly to beta support
    const type = buildType ?? process.env.METAMASK_BUILD_TYPE;
    if (type === 'beta') {
      onNavigate(
        'https://intercom.help/internal-beta-testing/en/',
        title,
      );
      return;
    }

    // Check if we should show the consent sheet
    if (!shouldShowConsentSheet && dataSharingPreference !== null) {
      // User has saved preference, use it directly
      const supportUrl = getSupportUrl(dataSharingPreference);

      supportUrl
        .then((url) => {
          onNavigate(url, title);
        })
        .catch((error) => {
          console.warn(
            'Error getting support URL with saved preference:',
            error,
          );
          // Fallback to base URL
          const fallbackUrl = 'https://support.metamask.io';
          onNavigate(fallbackUrl, title);
        });
      return;
    }

    // Show consent sheet when shouldShowConsentSheet is true or no data sharing preference is saved
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.SUPPORT_CONSENT_MODAL,
      params: {
        onConsent: handleConsent,
        onDecline: handleDecline,
      },
    });
  }, [
    buildType,
    shouldShowConsentSheet,
    dataSharingPreference,
    navigation,
    handleConsent,
    handleDecline,
    onNavigate,
    title,
  ]);

  return {
    openSupportWebPage,
    handleConsent,
    handleDecline,
  };
};
