import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { hasAcceptedSocialTerms } from '../../../../Views/SocialLeaderboard/terms/socialTermsAcceptance';
import { useSocialTermsGate } from '../../../../Views/SocialLeaderboard/terms/useSocialTermsGate';

/**
 * Press handler for social content on token details (feed cards, holder
 * rows) while the user has not accepted the Social terms. It opens the
 * existing terms / profile onboarding flow. Returns `undefined` once the
 * terms are accepted, so the content keeps its normal behaviour.
 *
 * Onboarding is a pushed screen, so accepting the terms there blurs this
 * screen; the acceptance (a sync MMKV read) is re-read each time it regains
 * focus.
 */
export const useSocialOnboardingPress = (): (() => void) | undefined => {
  const isFocused = useIsFocused();
  const [termsAccepted, setTermsAccepted] = useState(hasAcceptedSocialTerms);
  useEffect(() => {
    if (isFocused) {
      setTermsAccepted(hasAcceptedSocialTerms());
    }
  }, [isFocused]);
  const { ensureSocialTermsAccepted } = useSocialTermsGate();
  const openOnboarding = useCallback(() => {
    ensureSocialTermsAccepted();
  }, [ensureSocialTermsAccepted]);

  return termsAccepted ? undefined : openOnboarding;
};
