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
      return strings('rewards.error_messages.active_trader_cannot_be_referred');
    }
  }
  if (status === 429) {
    return strings('rewards.error_messages.rate_limited');
  }
  return strings('rewards.error_messages.something_went_wrong');
}

/** `Retry-After` on a 429, in seconds. Absent for every other refusal. */
function rateLimitWaitSeconds(error: unknown): number | undefined {
  if (!(error instanceof RewardsMoneyHttpError) || error.status !== 429) {
    return undefined;
  }
  return error.retryAfterSeconds;
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

function acceptAlreadyRunning(
  isAccepting: boolean,
  rateLimitUntil: number | null,
): boolean {
  if (isAccepting) {
    return true;
  }
  return rateLimitUntil !== null && Date.now() < rateLimitUntil;
}

function runIfMounted(isMounted: boolean, update: () => void): void {
  if (isMounted) {
    update();
  }
}

type ValidationOutcome =
  | { kind: 'thrown'; error: unknown }
  | { kind: 'invalid'; message: string }
  | { kind: 'ok' };

async function validationOutcome(
  validateCode: (code: string) => Promise<string>,
  code: string,
): Promise<ValidationOutcome> {
  let validationError: string;
  try {
    validationError = await validateCode(code);
  } catch (error) {
    return { kind: 'thrown', error };
  }
  if (!validationError) {
    return { kind: 'ok' };
  }
  return {
    kind: 'invalid',
    message:
      validationError === MONEY_REFERRAL_CODE_UNKNOWN_ERROR
        ? strings('rewards.error_messages.something_went_wrong')
        : validationError,
  };
}

function openAcceptedSplash(
  navigation: AppNavigationProp,
  sheetStillMounted: boolean,
): void {
  if (sheetStillMounted) {
    navigation.goBack();
  }
  navigation.navigate(Routes.REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_VIEW);
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
   * Epoch ms until which accept stays disabled after a 429. Null when the
   * refusal carried no `Retry-After`, or once that wait has elapsed.
   */
  acceptBlockedUntil: number | null;
  /**
   * Clears {@link errorMessage}. Call when the typed code changes so a
   * previous refusal does not outlive the code that caused it. A 429 wait
   * is left in place: editing the code does not spend the miss budget again.
   */
  clearError: () => void;
}

/**
 * Accepts a Rewards Money referral invite.
 *
 * Validation runs first so a malformed or unknown code never reaches
 * `POST /wr/referral/referee`. A refusal keeps the sheet open and writes the
 * reason onto {@link UseAcceptMoneyReferralCodeResult.errorMessage}; a
 * successful registration opens the accepted splash. When the sheet is still
 * mounted it is dismissed first. When it has already closed, the splash is
 * opened on its own so a mid-request dismiss does not drop a registration
 * that already succeeded. The `forceFresh` read back updates the persona when
 * it succeeds; a failed read does not block the splash.
 */
export const useAcceptMoneyReferralCode =
  (): UseAcceptMoneyReferralCodeResult => {
    const navigation = useNavigation<AppNavigationProp>();
    const { validateCode } = useValidateMoneyReferralCode();
    const { fetchReferralMe } = useReferralMe({ fetchOnMount: false });
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [acceptBlockedUntil, setAcceptBlockedUntil] = useState<number | null>(
      null,
    );
    const isAcceptingRef = useRef(false);
    const isMountedRef = useRef(true);
    const rateLimitUntilRef = useRef<number | null>(null);

    const clearError = useCallback(() => {
      if (
        rateLimitUntilRef.current !== null &&
        Date.now() < rateLimitUntilRef.current
      ) {
        return;
      }
      setErrorMessage('');
    }, []);

    const noteRefusal = useCallback((error: unknown) => {
      setErrorMessage(getRegisterRefereeErrorTitle(error));
      const waitSeconds = rateLimitWaitSeconds(error);
      if (waitSeconds === undefined) {
        rateLimitUntilRef.current = null;
        setAcceptBlockedUntil(null);
        return;
      }
      const until = Date.now() + waitSeconds * 1000;
      rateLimitUntilRef.current = until;
      setAcceptBlockedUntil(until);
    }, []);

    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
      };
    }, []);

    useEffect(() => {
      if (acceptBlockedUntil === null) {
        return undefined;
      }
      const remaining = acceptBlockedUntil - Date.now();
      const release = () => {
        rateLimitUntilRef.current = null;
        if (!isMountedRef.current) {
          return;
        }
        setAcceptBlockedUntil(null);
        setErrorMessage('');
      };
      if (remaining <= 0) {
        release();
        return undefined;
      }
      const timer = setTimeout(release, remaining);
      return () => clearTimeout(timer);
    }, [acceptBlockedUntil]);

    const refreshReferralMe = useCallback(
      () => refreshReferralMeWithRetries(fetchReferralMe),
      [fetchReferralMe],
    );

    const acceptReferralCode = useCallback(
      async (code: string): Promise<boolean> => {
        if (
          acceptAlreadyRunning(
            isAcceptingRef.current,
            rateLimitUntilRef.current,
          )
        ) {
          return false;
        }
        isAcceptingRef.current = true;
        runIfMounted(isMountedRef.current, () => setIsLoading(true));

        try {
          runIfMounted(isMountedRef.current, () => setErrorMessage(''));
          const validation = await validationOutcome(validateCode, code);
          if (validation.kind === 'thrown') {
            runIfMounted(isMountedRef.current, () =>
              noteRefusal(validation.error),
            );
            return false;
          }
          if (validation.kind === 'invalid') {
            // A failed validation call is not a code the server rejected, so it
            // does not claim the code is invalid.
            runIfMounted(isMountedRef.current, () =>
              setErrorMessage(validation.message),
            );
            return false;
          }

          try {
            await Engine.controllerMessenger.call(
              'RewardsMoneyController:registerReferee',
              { code: normalizeMoneyReferralCode(code) },
            );
          } catch (error) {
            runIfMounted(isMountedRef.current, () => noteRefusal(error));
            return false;
          }

          try {
            await refreshReferralMe();
          } catch {
            // A failed read does not block the splash.
          }

          // Registration already succeeded. Open the splash either way: a
          // failed read leaves the previous persona in place, and the Rewards
          // tab refetches referral me the next time it is focused. Skip
          // goBack when the sheet has already left the stack, or that pop
          // would dismiss the screen underneath it.
          openAcceptedSplash(navigation, isMountedRef.current);
          return true;
        } finally {
          isAcceptingRef.current = false;
          runIfMounted(isMountedRef.current, () => setIsLoading(false));
        }
      },
      [navigation, noteRefusal, refreshReferralMe, validateCode],
    );

    return {
      acceptReferralCode,
      isLoading,
      errorMessage,
      acceptBlockedUntil,
      clearError,
    };
  };

export default useAcceptMoneyReferralCode;
