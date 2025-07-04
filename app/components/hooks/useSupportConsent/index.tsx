import { useState, useCallback, useRef, useEffect } from 'react';
import getSupportUrl from '../../../util/support';

interface UseSupportConsentReturn {
  showConsentModal: boolean;
  openSupportWebPage: () => void;
  handleConsent: () => Promise<void>;
  handleDecline: () => Promise<void>;
}

/**
 * Custom hook to manage support consent flow
 * @param onNavigate - Callback to navigate to the support URL with title
 * @param title - Title for the support page
 * @returns Object with consent modal state and handlers
 */
export const useSupportConsent = (
  onNavigate: (url: string, title: string) => void,
  title: string,
): UseSupportConsentReturn => {
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Use refs to store the latest values to avoid dependency array issues
  const onNavigateRef = useRef(onNavigate);
  const titleRef = useRef(title);

  // Update refs when props change
  useEffect(() => {
    onNavigateRef.current = onNavigate;
    titleRef.current = title;
  }, [onNavigate, title]);

  const openSupportWebPage = useCallback(() => {
    // For beta builds, bypass consent flow and go directly to beta support
    if (process.env.METAMASK_BUILD_TYPE === 'beta') {
      onNavigateRef.current(
        'https://intercom.help/internal-beta-testing/en/',
        titleRef.current,
      );
      return;
    }

    // Default behavior for non-beta builds
    setShowConsentModal(true);
  }, []);

  const handleConsent = useCallback(async () => {
    try {
      const supportUrl = await getSupportUrl(true);
      console.log('User consented - Opening support URL with parameters:', supportUrl);
      setShowConsentModal(false);
      onNavigateRef.current(supportUrl, titleRef.current);
    } catch (error) {
      console.warn('Error getting support URL with consent:', error);
      // Fallback to base URL
      const supportUrl = await getSupportUrl(false);
      console.log('User consented but error occurred - Opening fallback URL:', supportUrl);
      setShowConsentModal(false);
      onNavigateRef.current(supportUrl, titleRef.current);
    }
  }, []);

  const handleDecline = useCallback(async () => {
    try {
      const supportUrl = await getSupportUrl(false);
      console.log('User declined - Opening support URL without parameters:', supportUrl);
      setShowConsentModal(false);
      onNavigateRef.current(supportUrl, titleRef.current);
    } catch (error) {
      console.warn('Error getting support URL without consent:', error);
      // Fallback to base URL
      const fallbackUrl = 'https://support.metamask.io';
      console.log('User declined but error occurred - Opening fallback URL:', fallbackUrl);
      setShowConsentModal(false);
      onNavigateRef.current(fallbackUrl, titleRef.current);
    }
  }, []);

  return {
    showConsentModal,
    openSupportWebPage,
    handleConsent,
    handleDecline,
  };
};
