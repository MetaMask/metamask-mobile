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
const RESTRICTED_COUNTRY_BODY_SNIPPET = 'restrictedcountrycodeerror';

/**
 * Stable reason a refused Accept was turned away. Sent as Segment
 * `refusal_reason`. Not the localized sheet copy.
 */
export type ReferralRefusalReason =
  | 'invalid_code'
  | 'already_referred'
  | 'own_code'
  | 'kol_cannot_register'
  | 'active_trader'
  | 'restricted_country'
  | 'rate_limited'
  | 'registration_failed';

/**
 * A refresh discarded because the session changed is retried under the new
 * identity rather than reported: the registration itself already succeeded.
 * Bounded so a session flipping repeatedly cannot spin here.
 */
export const MAX_REFERRAL_ME_REFRESH_ATTEMPTS = 3;

/** Maps a refused registration onto the analytics reason for that failure. */
export function getRegisterRefereeRefusalReason(
  error: unknown,
): ReferralRefusalReason {
  const status =
    error instanceof RewardsMoneyHttpError ? error.status : undefined;
  const bodyText =
    error instanceof RewardsMoneyHttpError ? (error.bodyText ?? '') : '';

  if (status === 422) {
    return 'invalid_code';
  }
  if (status === 409) {
    return 'already_referred';
  }
  if (status === 403) {
    const body = bodyText.toLowerCase();
    if (body.includes(SELF_REFERRAL_BODY_SNIPPET)) {
      return 'own_code';
    }
    if (body.includes(REFERRER_REFUSAL_BODY_SNIPPET)) {
      return 'kol_cannot_register';
    }
    if (body.includes(ACTIVE_TRADER_BODY_SNIPPET)) {
      return 'active_trader';
    }
    if (
      body.includes(RESTRICTED_COUNTRY_BODY_SNIPPET) ||
      body.includes('not available in your country')
    ) {
      return 'restricted_country';
    }
  }
  if (status === 429) {
    return 'rate_limited';
  }
  return 'registration_failed';
}

/** Maps a refused registration onto copy the user can act on. */
export function getRegisterRefereeErrorTitle(error: unknown): string {
  switch (getRegisterRefereeRefusalReason(error)) {
    case 'invalid_code':
      return strings('rewards.error_messages.invalid_referral_code');
    case 'already_referred':
      return strings('rewards.error_messages.already_referred');
    case 'own_code':
      return strings('rewards.error_messages.cannot_use_own_referral_code');
    case 'kol_cannot_register':
      return strings('rewards.error_messages.referrer_cannot_be_referred');
    case 'active_trader':
      return strings('rewards.error_messages.active_trader_cannot_be_referred');
    case 'restricted_country':
      return strings('rewards.onboarding.not_supported_region_description');
    case 'rate_limited':
      return strings('rewards.error_messages.rate_limited');
    case 'registration_failed':
      return strings('rewards.error_messages.something_went_wrong');
  }
}

export type AcceptReferralCodeResult =
  | { accepted: true }
  | { accepted: false; refusalReason?: ReferralRefusalReason };

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
  | { kind: 'unknown' }
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
  if (validationError === MONEY_REFERRAL_CODE_UNKNOWN_ERROR) {
    return { kind: 'unknown' };
  }
  return { kind: 'invalid', message: validationError };
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
   * referral me back. Resolves to whether the registration itself succeeded,
   * and on a register refusal the stable {@link ReferralRefusalReason}. A
   * failed read back still resolves accepted and still opens the accepted
   * splash. A client-side validation miss resolves without a reason: that
   * code never reached register.
   */
  acceptReferralCode: (code: string) => Promise<AcceptReferralCodeResult>;
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
   * Stable reason for the refusal currently on the sheet, when the failure
   * came from register. Null while idle, after a clear, or when the field
   * only shows a client-side validation miss.
   */
  refusalReason: ReferralRefusalReason | null;
  /**
   * Epoch ms until which accept stays disabled after a 429. Null when the
   * refusal carried no `Retry-After`, or once that wait has elapsed.
   */
  acceptBlockedUntil: number | null;
  /**
   * Clears {@link errorMessage} and {@link refusalReason}. Call when the typed
   * code changes so a previous refusal does not outlive the code that caused
   * it. A 429 wait is left in place: editing the code does not spend the miss
   * budget again.
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
    const [refusalReason, setRefusalReason] =
      useState<ReferralRefusalReason | null>(null);
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
      setRefusalReason(null);
    }, []);

    const noteRefusal = useCallback((error: unknown): ReferralRefusalReason => {
      const reason = getRegisterRefereeRefusalReason(error);
      setErrorMessage(getRegisterRefereeErrorTitle(error));
      setRefusalReason(reason);
      const waitSeconds = rateLimitWaitSeconds(error);
      if (waitSeconds === undefined) {
        rateLimitUntilRef.current = null;
        setAcceptBlockedUntil(null);
        return reason;
      }
      const until = Date.now() + waitSeconds * 1000;
      rateLimitUntilRef.current = until;
      setAcceptBlockedUntil(until);
      return reason;
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
        setRefusalReason(null);
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
      async (code: string): Promise<AcceptReferralCodeResult> => {
        if (
          acceptAlreadyRunning(
            isAcceptingRef.current,
            rateLimitUntilRef.current,
          )
        ) {
          return { accepted: false };
        }
        isAcceptingRef.current = true;
        runIfMounted(isMountedRef.current, () => setIsLoading(true));

        try {
          runIfMounted(isMountedRef.current, () => {
            setErrorMessage('');
            setRefusalReason(null);
          });
          const validation = await validationOutcome(validateCode, code);
          if (validation.kind === 'thrown') {
            const refusal = isMountedRef.current
              ? noteRefusal(validation.error)
              : getRegisterRefereeRefusalReason(validation.error);
            return { accepted: false, refusalReason: refusal };
          }
          if (validation.kind === 'invalid') {
            runIfMounted(isMountedRef.current, () => {
              setErrorMessage(validation.message);
              setRefusalReason('invalid_code');
            });
            return { accepted: false, refusalReason: 'invalid_code' };
          }

          // An unknown validate result could not reach the server. Register is
          // the authority, matching extension.
          try {
            await Engine.controllerMessenger.call(
              'RewardsMoneyController:registerReferee',
              { code: normalizeMoneyReferralCode(code) },
            );
          } catch (error) {
            const refusal = isMountedRef.current
              ? noteRefusal(error)
              : getRegisterRefereeRefusalReason(error);
            return { accepted: false, refusalReason: refusal };
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
          return { accepted: true };
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
      refusalReason,
      acceptBlockedUntil,
      clearError,
    };
  };

export default useAcceptMoneyReferralCode;
