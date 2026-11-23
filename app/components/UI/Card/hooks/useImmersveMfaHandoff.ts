import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import {
  CardProviderError,
  CardProviderErrorCode,
  type CardAuthResult,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import type {
  CardMfaMethodParams,
  ImmersveMfaContinuation,
} from '../Views/CardMfa/types';

export interface ImmersveMfaHandoffParams {
  country: string;
  address: string;
  continuation: ImmersveMfaContinuation;
}

/**
 * Opens the MFA screen for a sign-in that is not finished.
 *
 * The screens live on the Card screens stack, next to sign-in and onboarding.
 * `navigate` bubbles out of OnboardingNavigator, so sign-up for an existing
 * account reaches them the same way the sign-in screen does.
 *
 * Returns true when it opened a screen. A finished login returns false.
 * Any other unfinished step throws, so onboarding does not continue without tokens.
 */
export function useImmersveMfaHandoff() {
  const navigation = useNavigation<AppNavigationProp>();

  return useCallback(
    (result: CardAuthResult, params: ImmersveMfaHandoffParams): boolean => {
      const step = result.nextStep;
      const shared: CardMfaMethodParams = {
        country: params.country,
        address: params.address,
        options: [],
        continuation: params.continuation,
      };

      if (step?.type === 'mfa_select') {
        navigation.navigate(Routes.CARD.MFA_METHOD, {
          ...shared,
          options: step.options,
        });
        return true;
      }

      if (step?.type === 'mfa_code') {
        navigation.navigate(Routes.CARD.MFA_CODE, {
          ...shared,
          options: [
            {
              method: step.method,
              maskedDestination: step.maskedDestination,
            },
          ],
          method: step.method,
          maskedDestination: step.maskedDestination,
          expiresAt: step.expiresAt,
        });
        return true;
      }

      if (!result.done) {
        throw new CardProviderError(
          CardProviderErrorCode.Unknown,
          'Unexpected login step',
        );
      }

      return false;
    },
    [navigation],
  );
}
