import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { ensureSocialTermsAccepted } from './socialTermsAcceptance';

export interface UseSocialTermsGateResult {
  /**
   * @param onAccepted - Runs the blocked action again once the terms-only
   * screen is accepted.
   */
  ensureSocialTermsAccepted: (onAccepted?: () => void) => boolean;
}

/**
 * React wrapper around `ensureSocialTermsAccepted`. Reads storage only, so it
 * is safe to mount once per list row.
 */
export const useSocialTermsGate = (): UseSocialTermsGateResult => {
  const navigation = useNavigation<AppNavigationProp>();

  const ensure = useCallback(
    (onAccepted?: () => void) =>
      ensureSocialTermsAccepted(navigation.navigate, onAccepted),
    [navigation],
  );

  return { ensureSocialTermsAccepted: ensure };
};

export default useSocialTermsGate;
