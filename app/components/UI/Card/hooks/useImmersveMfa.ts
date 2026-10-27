import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import {
  CardProviderError,
  CardProviderErrorCode,
  CardProviderIds,
  type CardAuthResult,
  type CardMfaMethod,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { useImmersveResumeOnboarding } from './useImmersveResumeOnboarding';
import type { ImmersveMfaContinuation } from '../Views/CardMfa/types';

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
 * Submits Immersve MFA steps and leaves the in-memory login when the user
 * backs out. Forward navigation calls `markAdvancing` first so replacing the
 * method screen with the code screen does not drop the session.
 */
export function useImmersveMfa() {
  const navigation = useNavigation();
  const resume = useImmersveResumeOnboarding();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const advancingRef = useRef(false);

  const abandon = useCallback(() => {
    Engine.context.CardController.abandonAuth();
  }, []);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (advancingRef.current) {
          return;
        }
        const actionType = event.data.action.type;
        if (actionType === 'GO_BACK' || actionType === 'POP') {
          abandon();
        }
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

  return {
    isSubmitting,
    submitMethod,
    submitCode,
    restart,
    abandon,
    continueAfterAuth,
    markAdvancing,
  };
}
