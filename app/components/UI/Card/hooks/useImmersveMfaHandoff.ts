import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import type { CardMfaMethodParams } from '../Views/CardMfa/types';

/**
 * Opens the MFA method picker.
 *
 * The screens live on the Card screens stack, next to sign-in and onboarding.
 * `navigate` bubbles out of OnboardingNavigator, so sign-up for an existing
 * account reaches them the same way the sign-in screen does.
 */
export function useImmersveMfaHandoff() {
  const navigation = useNavigation<AppNavigationProp>();

  return useCallback(
    (params: CardMfaMethodParams) => {
      navigation.navigate(Routes.CARD.MFA_METHOD, params);
    },
    [navigation],
  );
}
