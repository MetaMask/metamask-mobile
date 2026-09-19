import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import type { RootState } from '../../../../reducers';
import {
  selectReferralMeEntry,
  selectReferralMeLocalizedText,
} from '../../../../reducers/rewardsMoney/selectors';
import { RewardsMoneyHttpError } from '../../../../core/Engine/controllers/rewards-money-controller/services';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import useRewardsToast from './useRewardsToast';
import { useReferralMe } from './useReferralMe';
import {
  MONEY_REFERRAL_CODE_UNKNOWN_ERROR,
  normalizeMoneyReferralCode,
  useValidateMoneyReferralCode,
} from './useValidateMoneyReferralCode';

/**
 * Substring the API uses when it refuses a self-referral. A 403 also covers
 * refusals we cannot name for the user (KOL, active trader), so the body is
 * what separates them.
 */
const SELF_REFERRAL_BODY_SNIPPET = 'own referral code';

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
  if (
    status === 403 &&
    bodyText.toLowerCase().includes(SELF_REFERRAL_BODY_SNIPPET)
  ) {
    return strings('rewards.error_messages.cannot_use_own_referral_code');
  }
  return strings('rewards.error_messages.something_went_wrong');
}

export interface UseAcceptMoneyReferralCodeResult {
  /**
   * Validates the code, registers the session profile as a referee, then reads
   * referral me back. Resolves to whether the registration itself succeeded —
   * a failed read back after a successful registration still resolves true.
   */
  acceptReferralCode: (code: string) => Promise<boolean>;
  /**
   * Whether an accept attempt is in progress
   */
  isLoading: boolean;
}

/**
 * Accepts a Rewards Money referral invite.
 *
 * Validation runs first so a malformed or unknown code never reaches
 * `POST /wr/referral/referee`. A refusal keeps the sheet open with the reason;
 * only a successful registration dismisses it, after the referral role has
 * been read back with `forceFresh` so Rewards Home routes to the Money
 * dashboard on the way out.
 */
export const useAcceptMoneyReferralCode =
  (): UseAcceptMoneyReferralCodeResult => {
    const navigation = useNavigation<AppNavigationProp>();
    const store = useStore();
    const { showToast, RewardsToastOptions } = useRewardsToast();
    const { validateCode } = useValidateMoneyReferralCode();
    const { fetchReferralMe } = useReferralMe({ fetchOnMount: false });
    const [isLoading, setIsLoading] = useState(false);
    const isAcceptingRef = useRef(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
      };
    }, []);

    /**
     * Reads referral me back under the identity that is current when it
     * settles. Returns the profile the entry landed under, or undefined when
     * the read failed or no identity settled in time.
     */
    const refreshReferralMe = useCallback(async (): Promise<
      string | undefined
    > => {
      for (
        let attempt = 0;
        attempt < MAX_REFERRAL_ME_REFRESH_ATTEMPTS;
        attempt += 1
      ) {
        const result = await fetchReferralMe({ forceFresh: true });
        if (result.status !== 'settled') {
          continue;
        }
        if (!result.profileId) {
          return undefined;
        }
        const entry = selectReferralMeEntry(
          store.getState() as RootState,
          result.profileId,
        );
        return entry && !entry.error ? result.profileId : undefined;
      }
      return undefined;
    }, [fetchReferralMe, store]);

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
          const validationError = await validateCode(code);
          if (validationError) {
            // A failed validation call is not a code the server rejected, so it
            // does not claim the code is invalid.
            if (isMountedRef.current) {
              showToast(
                RewardsToastOptions.error(
                  validationError === MONEY_REFERRAL_CODE_UNKNOWN_ERROR
                    ? strings('rewards.error_messages.something_went_wrong')
                    : validationError,
                ),
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
              showToast(
                RewardsToastOptions.error(getRegisterRefereeErrorTitle(error)),
              );
            }
            return false;
          }

          let refreshedProfileId: string | undefined;
          try {
            refreshedProfileId = await refreshReferralMe();
          } catch {
            refreshedProfileId = undefined;
          }

          if (!isMountedRef.current) {
            return true;
          }

          // The registration stands either way, so the sheet closes either
          // way; a failed read back is reported as the fetch failure it is.
          if (refreshedProfileId) {
            const acceptedToast = selectReferralMeLocalizedText(
              store.getState() as RootState,
              refreshedProfileId,
            )?.inviteAcceptedToast;
            if (acceptedToast) {
              showToast(RewardsToastOptions.success(acceptedToast));
            }
          } else {
            showToast(
              RewardsToastOptions.error(
                strings('rewards.referral_details_error.error_fetching_title'),
              ),
            );
          }

          navigation.goBack();
          return true;
        } finally {
          isAcceptingRef.current = false;
          if (isMountedRef.current) {
            setIsLoading(false);
          }
        }
      },
      [
        RewardsToastOptions,
        navigation,
        refreshReferralMe,
        showToast,
        store,
        validateCode,
      ],
    );

    return { acceptReferralCode, isLoading };
  };

export default useAcceptMoneyReferralCode;
