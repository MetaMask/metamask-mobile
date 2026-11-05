import { useIsFocused } from '@react-navigation/native';
import { useCallback } from 'react';
import { hasAcceptedSocialTerms } from '../../../../Views/SocialLeaderboard/terms/socialTermsAcceptance';
import { useSocialTermsGate } from '../../../../Views/SocialLeaderboard/terms/useSocialTermsGate';

/**
 * Press handler for social content on token details (feed cards, holder
 * rows) while the user has not accepted the Social terms. It opens the
 * existing terms / profile onboarding flow. Returns `undefined` once the
 * terms are accepted, so the content keeps its normal behaviour.
 *
 * The acceptance is a sync MMKV read; focus changes re-render the caller so
 * the result refreshes when the user comes back from onboarding.
 */
export const useSocialOnboardingPress = (): (() => void) | undefined => {
  useIsFocused();
  const { ensureSocialTermsAccepted } = useSocialTermsGate();
  const openOnboarding = useCallback(() => {
    ensureSocialTermsAccepted();
  }, [ensureSocialTermsAccepted]);

  return hasAcceptedSocialTerms() ? undefined : openOnboarding;
};
