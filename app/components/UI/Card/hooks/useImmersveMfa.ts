import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import type { AppStackNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import {
  CardProviderError,
  CardProviderErrorCode,
  CardProviderIds,
  type CardAuthResult,
  type CardMfaMethod,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { useImmersveResumeOnboarding } from './useImmersveResumeOnboarding';
import type {
  CardMfaMethodParams,
  ImmersveMfaContinuation,
} from '../Views/CardMfa/types';

export type ImmersveMfaErrorKind =
  | 'destination_mismatch'
  | 'invalid_code'
  | 'restart_required'
  | 'unknown';

export function classifyImmersveMfaError(error: unknown): ImmersveMfaErrorKind {
  if (!(error instanceof CardProviderError)) {
    return 'unknown';
  }
  switch (error.code) {
    case CardProviderErrorCode.MfaDestinationMismatch:
      return 'destination_mismatch';
    case CardProviderErrorCode.InvalidOtp:
      return 'invalid_code';
    case CardProviderErrorCode.AuthRestartRequired:
      return 'restart_required';
    default:
      return 'unknown';
  }
}

/**
 * Submits Immersve MFA steps and leaves the in-memory login when the screen
 * is removed. Forward navigation calls `markAdvancing` first so replacing one
 * MFA screen with the next does not drop the session.
 */
export function useImmersveMfa() {
  const navigation = useNavigation<AppStackNavigationProp>();
  const resume = useImmersveResumeOnboarding();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const advancingRef = useRef(false);

  const abandon = useCallback(() => {
    Engine.context.CardController.abandonAuth();
  }, []);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        if (advancingRef.current) {
          return;
        }
        abandon();
      }),
    [abandon, navigation],
  );

  const markAdvancing = useCallback(() => {
    advancingRef.current = true;
  }, []);

  const submitMethod = useCallback(
    async (
      method: CardMfaMethod,
      destination: string,
    ): Promise<CardAuthResult> => {
      setIsSubmitting(true);
      try {
        return await Engine.context.CardController.submitCredentials({
          type: 'mfa_method',
          method,
          destination,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const submitCode = useCallback(
    async (code: string): Promise<CardAuthResult> => {
      setIsSubmitting(true);
      try {
        return await Engine.context.CardController.submitCredentials({
          type: 'mfa_code',
          code,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const restart = useCallback(
    async (country: string, address: string): Promise<CardAuthResult> => {
      setIsSubmitting(true);
      try {
        return await Engine.context.CardController.authenticateWithWallet({
          option: { providerId: CardProviderIds.Immersve, method: 'siwe' },
          address,
          country,
          autoSignup: false,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const continueAfterAuth = useCallback(
    async ({
      country,
      address,
      continuation,
    }: {
      country: string;
      address: string;
      continuation: ImmersveMfaContinuation;
    }) => {
      await resume({
        country,
        address,
        email: continuation.email,
        phone: continuation.phone,
        showAccountExistsToast: continuation.showAccountExistsToast,
        navigateFromRoot: continuation.navigateFromRoot,
        entrypoint: continuation.entrypoint,
        alreadyAuthenticated: true,
      });
    },
    [resume],
  );

  const goToNextStep = useCallback(
    async (result: CardAuthResult, params: CardMfaMethodParams) => {
      const step = result.nextStep;
      if (step?.type === 'mfa_select') {
        markAdvancing();
        navigation.replace(Routes.CARD.MFA_METHOD, {
          country: params.country,
          address: params.address,
          options: step.options,
          continuation: params.continuation,
        });
        return;
      }
      if (step?.type === 'mfa_code') {
        markAdvancing();
        navigation.replace(Routes.CARD.MFA_CODE, {
          country: params.country,
          address: params.address,
          options: params.options,
          continuation: params.continuation,
          method: step.method,
          maskedDestination: step.maskedDestination,
          expiresAt: step.expiresAt,
        });
        return;
      }
      if (result.done) {
        markAdvancing();
        await continueAfterAuth({
          country: params.country,
          address: params.address,
          continuation: params.continuation,
        });
        return;
      }
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Unexpected login step',
      );
    },
    [continueAfterAuth, markAdvancing, navigation],
  );

  return {
    isSubmitting,
    submitMethod,
    submitCode,
    restart,
    abandon,
    continueAfterAuth,
    markAdvancing,
    goToNextStep,
  };
}
