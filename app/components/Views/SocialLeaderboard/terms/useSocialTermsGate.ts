import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { ensureSocialTermsAccepted } from './socialTermsAcceptance';

export interface UseSocialTermsGateResult {
  ensureSocialTermsAccepted: () => boolean;
}

/**
 * React wrapper around `ensureSocialTermsAccepted`. Reads storage only, so it
 * is safe to mount once per list row.
 */
export const useSocialTermsGate = (): UseSocialTermsGateResult => {
  const navigation = useNavigation<AppNavigationProp>();

  const ensure = useCallback(
    () => ensureSocialTermsAccepted(navigation.navigate),
    [navigation],
  );

  return { ensureSocialTermsAccepted: ensure };
};

export default useSocialTermsGate;
