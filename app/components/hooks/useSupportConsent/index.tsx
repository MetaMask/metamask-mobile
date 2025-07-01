import { useState, useCallback } from 'react';
import getSupportUrl from '../../../util/support';

interface UseSupportConsentReturn {
  showConsentModal: boolean;
  handleSupportRedirect: () => void;
  handleConsent: () => Promise<void>;
  handleDecline: () => Promise<void>;
}

/**
 * Custom hook to manage support consent flow
 * @param onNavigate - Callback to navigate to the support URL
 * @returns Object with consent modal state and handlers
 */
export const useSupportConsent = (
  onNavigate: (url: string) => void,
): UseSupportConsentReturn => {
  const [showConsentModal, setShowConsentModal] = useState(false);

  const handleSupportRedirect = useCallback(() => {
    setShowConsentModal(true);
  }, []);

  const handleConsent = useCallback(async () => {
    try {
      const supportUrl = await getSupportUrl(true);
      setShowConsentModal(false);
      onNavigate(supportUrl);
    } catch (error) {
      console.warn('Error getting support URL with consent:', error);
      // Fallback to base URL
      const supportUrl = await getSupportUrl(false);
      setShowConsentModal(false);
      onNavigate(supportUrl);
    }
  }, [onNavigate]);

  const handleDecline = useCallback(async () => {
    try {
      const supportUrl = await getSupportUrl(false);
      setShowConsentModal(false);
      onNavigate(supportUrl);
    } catch (error) {
      console.warn('Error getting support URL without consent:', error);
      // Fallback to base URL
      setShowConsentModal(false);
      onNavigate('https://support.metamask.io');
    }
  }, [onNavigate]);

  return {
    showConsentModal,
    handleSupportRedirect,
    handleConsent,
    handleDecline,
  };
}; 