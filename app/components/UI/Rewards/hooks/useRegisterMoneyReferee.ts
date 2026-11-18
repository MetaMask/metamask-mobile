import { useCallback } from 'react';
import Engine from '../../../../core/Engine';
import { normalizeMoneyReferralCode } from '../utils/moneyReferralCode';
import { useReferralMe, type FetchReferralMeResult } from './useReferralMe';
import {
  MONEY_REFERRAL_CODE_UNKNOWN_ERROR,
  validateMoneyReferralCode,
} from './useValidateMoneyReferralCode';

/**
 * A refresh discarded because the session changed is retried under the new
 * identity rather than reported: the registration itself already succeeded.
 * Bounded so a session flipping repeatedly cannot spin here.
 */
export const MAX_REFERRAL_ME_REFRESH_ATTEMPTS = 3;

/**
 * Outcome of one registration attempt. `accepted` means register succeeded;
 * a failed read back still counts. `invalid` means client-side validation
 * rejected the code before register, with the copy to show. `refused` means
 * validation or register threw, carrying the error for the caller to map onto
 * copy, analytics and any rate-limit wait.
 */
export type RegisterMoneyRefereeResult =
  | { status: 'accepted' }
  | { status: 'invalid'; message: string }
  | { status: 'refused'; error: unknown };

/**
 * Reads referral me back with `forceFresh`, retrying while the session
 * changes mid-read, so one settled read lands under whichever identity is
 * current when it stops retrying. The caller does not act on the result.
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

/**
 * Registers the session profile as a Rewards Money referee: validates the
 * code, calls `registerReferee`, then reads referral me back.
 *
 * Validation runs first so a malformed or unknown code never reaches
 * `POST /wr/referral/referee`. A validate result that could not reach the
 * server still goes to register, which is the authority, matching extension.
 * Navigation, copy and analytics belong to the caller.
 */
export const useRegisterMoneyReferee = (): ((
  code: string,
) => Promise<RegisterMoneyRefereeResult>) => {
  const { fetchReferralMe } = useReferralMe({ fetchOnMount: false });

  return useCallback(
    async (code: string): Promise<RegisterMoneyRefereeResult> => {
      let validationError: string;
      try {
        validationError = await validateMoneyReferralCode(code);
      } catch (error) {
        return { status: 'refused', error };
      }
      if (
        validationError &&
        validationError !== MONEY_REFERRAL_CODE_UNKNOWN_ERROR
      ) {
        return { status: 'invalid', message: validationError };
      }

      try {
        await Engine.controllerMessenger.call(
          'RewardsMoneyController:registerReferee',
          { code: normalizeMoneyReferralCode(code) },
        );
      } catch (error) {
        return { status: 'refused', error };
      }

      try {
        await refreshReferralMeWithRetries(fetchReferralMe);
      } catch {
        // A failed read does not undo a registration that succeeded.
      }
      return { status: 'accepted' };
    },
    [fetchReferralMe],
  );
};
