import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import { RewardsMoneyHttpError } from '../../../../core/Engine/controllers/rewards-money-controller/services';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { useReferralMe, type FetchReferralMeResult } from './useReferralMe';
import {
  MONEY_REFERRAL_CODE_UNKNOWN_ERROR,
  normalizeMoneyReferralCode,
  useValidateMoneyReferralCode,
} from './useValidateMoneyReferralCode';

/**
 * Substrings the API uses on the refusals a 403 can carry. The status alone
 * cannot separate them — self-referral, a referrer being referred, and an
 * active trader all answer 403 — so the body is what names each one.
 */
const SELF_REFERRAL_BODY_SNIPPET = 'own referral code';
const REFERRER_REFUSAL_BODY_SNIPPET = 'kol cannot register as a referee';
const ACTIVE_TRADER_BODY_SNIPPET = 'recent trading activity';

/**
 * A refresh discarded because the session changed is retried under the new
 * identity rather than reported: the registration itself already succeeded.
 * Bounded so a session flipping repeatedly cannot spin here.
 */
export const MAX_REFERRAL_ME_REFRESH_ATTEMPTS = 3;

/** Maps a refused registration onto copy the user can act on. */
export function getRegisterRefereeErrorTitle(error: unknown): string {
  const status =
    error instanceof RewardsMoneyHttpError ? error.status : undefined;
  const bodyText =
    error instanceof RewardsMoneyHttpError ? (error.bodyText ?? '') : '';

  if (status === 422) {
    return strings('rewards.error_messages.invalid_referral_code');
  }
  if (status === 409) {
    return strings('rewards.error_messages.already_referred');
  }
  if (status === 403) {
    const body = bodyText.toLowerCase();
    if (body.includes(SELF_REFERRAL_BODY_SNIPPET)) {
      return strings('rewards.error_messages.cannot_use_own_referral_code');
    }
    if (body.includes(REFERRER_REFUSAL_BODY_SNIPPET)) {
      return strings('rewards.error_messages.referrer_cannot_be_referred');
    }
    if (body.includes(ACTIVE_TRADER_BODY_SNIPPET)) {
      return strings(
        'rewards.error_messages.active_trader_cannot_be_referred',
      );
    }
  }
  return strings('rewards.error_messages.something_went_wrong');
}

/**
 * Reads referral me back with `forceFresh`, retrying while the session
 * changes mid-read. The caller does not act on the result — a failed or
 * discarded read still lets the accepted splash open — so this reports
 * nothing back; it only drives `fetchReferralMe` enough times to land one
 * settled read under whichever identity is current when it stops retrying.
 */
async function refreshReferralMeWithRetries(
  fetchReferralMe: (options?: {
    forceFresh?: boolean;
  }) => Promise<FetchReferralMeResult>,
): Promise<void> {
  for (
    let attempt = 0;
    attempt < MAX_REFERRAL_ME_REFRESH_ATTEMPTS;
    attempt += 1
  ) {
    const result = await fetchReferralMe({ forceFresh: true });
    if (result.status === 'settled') {
      return;
    }
  }
}

export interface UseAcceptMoneyReferralCodeResult {
  /**
   * Validates the code, registers the session profile as a referee, then reads
   * referral me back. Resolves to whether the registration itself succeeded.
   * A failed read back still resolves true and still opens the accepted splash.
   */
  acceptReferralCode: (code: string) => Promise<boolean>;
  /**
   * Whether an accept attempt is in progress
   */
  isLoading: boolean;
  /**
   * Refusal copy for the invite sheet field. Empty while idle or after a
   * successful registration. A toast is not used for these refusals: the
   * sheet already shows validation the same way.
   */
  errorMessage: string;
  /**
   * Clears {@link errorMessage}. Call when the typed code changes so a
   * previous refusal does not outlive the code that caused it.
   */
  clearError: () => void;
}

/**
 * Accepts a Rewards Money referral invite.
 *
 * Validation runs first so a malformed or unknown code never reaches
 * `POST /wr/referral/referee`. A refusal keeps the sheet open and writes the
 * reason onto {@link UseAcceptMoneyReferralCodeResult.errorMessage}; only a
 * successful registration dismisses it and opens the accepted splash. The
 * `forceFresh` read back updates the persona when it succeeds; a failed read
 * does not block the splash.
 */
export const useAcceptMoneyReferralCode =
  (): UseAcceptMoneyReferralCodeResult => {
    const navigation = useNavigation<AppNavigationProp>();
    const { validateCode } = useValidateMoneyReferralCode();
    const { fetchReferralMe } = useReferralMe({ fetchOnMount: false });
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const isAcceptingRef = useRef(false);
    const isMountedRef = useRef(true);

    const clearError = useCallback(() => {
      setErrorMessage('');
    }, []);

    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
      };
    }, []);

    const refreshReferralMe = useCallback(
      () => refreshReferralMeWithRetries(fetchReferralMe),
      [fetchReferralMe],
    );

    const acceptReferralCode = useCallback(
      async (code: string): Promise<boolean> => {
        if (isAcceptingRef.current) {
          return false;
        }
        isAcceptingRef.current = true;
        if (isMountedRef.current) {
          setIsLoading(true);
        }

        try {
          if (isMountedRef.current) {
            setErrorMessage('');
          }
          const validationError = await validateCode(code);
          if (validationError) {
            // A failed validation call is not a code the server rejected, so it
            // does not claim the code is invalid.
            if (isMountedRef.current) {
              setErrorMessage(
                validationError === MONEY_REFERRAL_CODE_UNKNOWN_ERROR
                  ? strings('rewards.error_messages.something_went_wrong')
                  : validationError,
              );
            }
            return false;
          }

          try {
            await Engine.controllerMessenger.call(
              'RewardsMoneyController:registerReferee',
              { code: normalizeMoneyReferralCode(code) },
            );
          } catch (error) {
            if (isMountedRef.current) {
              setErrorMessage(getRegisterRefereeErrorTitle(error));
            }
            return false;
          }

          try {
            await refreshReferralMe();
          } catch {
            // A failed read does not block the splash.
          }

          if (!isMountedRef.current) {
            return true;
          }

          // Registration already succeeded. Open the splash either way: a
          // failed read leaves the previous persona in place, and the Rewards
          // tab refetches referral me the next time it is focused.
          navigation.goBack();
          navigation.navigate(
            Routes.REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_VIEW,
          );
          return true;
        } finally {
          isAcceptingRef.current = false;
          if (isMountedRef.current) {
            setIsLoading(false);
          }
        }
      },
      [navigation, refreshReferralMe, validateCode],
    );

    return { acceptReferralCode, isLoading, errorMessage, clearError };
  };

export default useAcceptMoneyReferralCode;
