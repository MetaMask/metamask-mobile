import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { ensureSocialTermsAccepted } from './socialTermsAcceptance';

export interface UseSocialTermsGateOptions {
  /**
   * Runs the onboarding navigation. A bottom sheet passes one that closes the
   * sheet first, so onboarding opens full screen instead of inside the sheet.
   * Defaults to navigating immediately.
   */
  runNavigation?: (navigate: () => void) => void;
}

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
export const useSocialTermsGate = ({
  runNavigation,
}: UseSocialTermsGateOptions = {}): UseSocialTermsGateResult => {
  const navigation = useNavigation<AppNavigationProp>();

  const ensure = useCallback(
    (onAccepted?: () => void): boolean =>
      ensureSocialTermsAccepted(navigation.navigate, onAccepted, runNavigation),
    [navigation, runNavigation],
  );

  return { ensureSocialTermsAccepted: ensure };
};

export default useSocialTermsGate;
