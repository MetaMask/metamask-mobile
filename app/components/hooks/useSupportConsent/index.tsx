import { useCallback, useRef, useEffect } from 'react';
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

  // Use refs to store the latest values to avoid dependency array issues
  const onNavigateRef = useRef(onNavigate);
  const titleRef = useRef(title);

  // Update refs when props change
  useEffect(() => {
    onNavigateRef.current = onNavigate;
    titleRef.current = title;
  }, [onNavigate, title]);

  const handleConsent = useCallback(async () => {
    try {
      const supportUrl = await getSupportUrl(true);
      onNavigateRef.current(supportUrl, titleRef.current);
    } catch (error) {
      console.warn('Error getting support URL with consent:', error);
      // Fallback to base URL
      const supportUrl = await getSupportUrl(false);
      onNavigateRef.current(supportUrl, titleRef.current);
    }
  }, []);

  const handleDecline = useCallback(async () => {
    try {
      const supportUrl = await getSupportUrl(false);
      onNavigateRef.current(supportUrl, titleRef.current);
    } catch (error) {
      console.warn('Error getting support URL without consent:', error);
      // Fallback to base URL
      const fallbackUrl = 'https://support.metamask.io';
      onNavigateRef.current(fallbackUrl, titleRef.current);
    }
  }, []);

  const openSupportWebPage = useCallback(() => {
    // For beta builds, bypass consent flow and go directly to beta support
    const type = buildType ?? process.env.METAMASK_BUILD_TYPE;
    if (type === 'beta') {
      onNavigateRef.current(
        'https://intercom.help/internal-beta-testing/en/',
        titleRef.current,
      );
      return;
    }

    // Check if we should show the consent sheet
    if (!shouldShowConsentSheet && dataSharingPreference !== null) {
      // User has saved preference, use it directly
      const supportUrl = getSupportUrl(dataSharingPreference);

      supportUrl
        .then((url) => {
          onNavigateRef.current(url, titleRef.current);
        })
        .catch((error) => {
          console.warn(
            'Error getting support URL with saved preference:',
            error,
          );
          // Fallback to base URL
          const fallbackUrl = 'https://support.metamask.io';
          onNavigateRef.current(fallbackUrl, titleRef.current);
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
  ]);

  return {
    openSupportWebPage,
    handleConsent,
    handleDecline,
  };
};
