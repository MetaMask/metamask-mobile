import { useEffect, useState } from 'react';
import { useSelector, useStore } from 'react-redux';
import type { RootState } from '../../../../reducers';
import {
  canAcceptMoneyReferralInvite,
  selectMoneyReferralAllowedForGeo,
  selectPendingMoneyReferralCode,
  selectReferralMeEntry,
} from '../../../../reducers/rewardsMoney/selectors';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { selectRewardsMoneyControllerEnabled } from '../../../../selectors/featureFlagController/rewardsMoneyController';
import { useReferralMe } from '../../../UI/Rewards/hooks/useReferralMe';
import { MONEY_REFERRAL_INVITE_LOAD_BUDGET_MS } from '../../../UI/Rewards/components/Money/PendingMoneyReferralInvite';
import {
  resolveInviteTermsLink,
  type InviteTermsLink,
} from '../../../UI/Rewards/utils/inviteTermsLink';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

const LOG_PREFIX = '[TraderPreviewSheet]';

/** Why a link's referral code is not shown. */
export type SocialPreviewReferralSkipReason =
  | 'basic_functionality_off'
  | 'rewards_money_off'
  | 'read_timed_out'
  | 'read_failed'
  | 'read_discarded'
  | 'already_referred'
  | 'region_excluded';

const logSkippedReferral = (
  referralCode: string,
  reason: SocialPreviewReferralSkipReason,
) => {
  DevLogger.log(`${LOG_PREFIX} Not offering the referral code`, {
    referralCode,
    reason,
  });
};

export type SocialPreviewReferralOfferStatus = 'none' | 'checking' | 'offered';

export interface SocialPreviewReferralOffer {
  status: SocialPreviewReferralOfferStatus;
  /** The link's pending Money referral code, offered or not. */
  pendingReferralCode: string | null;
  /** Server copy for what accepting earns, once the code is offered. */
  benefitTitle: string | null;
  /** The invite "Learn more" link, once the code is offered and has one. */
  termsLink: InviteTermsLink | null;
}

/**
 * Whether the trader preview should offer the link's Money referral code.
 * Uses the same checks as the standalone invite: basic functionality, the
 * Rewards Money flag, a fresh referral me showing the user can still be
 * referred, and an allowed region. Only a read that succeeded counts: one
 * slower than the invite's load budget, one that fails, or one that leaves an
 * errored entry offers nothing.
 */
export const useSocialPreviewReferralOffer = (): SocialPreviewReferralOffer => {
  const store = useStore<RootState>();
  const pendingReferralCode = useSelector(selectPendingMoneyReferralCode);
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const isRewardsMoneyEnabled = useSelector(
    selectRewardsMoneyControllerEnabled,
  );
  const canCheck = Boolean(
    pendingReferralCode && isBasicFunctionalityEnabled && isRewardsMoneyEnabled,
  );
  const { fetchReferralMe } = useReferralMe({ fetchOnMount: false });
  const [status, setStatus] = useState<SocialPreviewReferralOfferStatus>(
    canCheck ? 'checking' : 'none',
  );
  const [benefitTitle, setBenefitTitle] = useState<string | null>(null);
  const [termsLink, setTermsLink] = useState<InviteTermsLink | null>(null);

  useEffect(() => {
    if (!canCheck) {
      if (pendingReferralCode) {
        logSkippedReferral(
          pendingReferralCode,
          isBasicFunctionalityEnabled
            ? 'rewards_money_off'
            : 'basic_functionality_off',
        );
      }
      setStatus('none');
      return undefined;
    }
    const referralCode = pendingReferralCode as string;
    let cancelled = false;
    setStatus('checking');
    const budgetTimer = setTimeout(() => {
      cancelled = true;
      logSkippedReferral(referralCode, 'read_timed_out');
      setStatus('none');
    }, MONEY_REFERRAL_INVITE_LOAD_BUDGET_MS);

    fetchReferralMe({ forceFresh: true })
      .then((result) => {
        if (cancelled) {
          return;
        }
        clearTimeout(budgetTimer);
        const state = store.getState();
        const entry =
          result.status === 'settled'
            ? selectReferralMeEntry(state, result.profileId)
            : undefined;
        // A failed read settles with `error` set but keeps the previous
        // payload, which may predate the user being referred.
        const referralMe = entry && !entry.error ? entry.data : null;
        let skipReason: SocialPreviewReferralSkipReason | null = null;
        if (!referralMe) {
          skipReason =
            result.status === 'settled' ? 'read_failed' : 'read_discarded';
        } else if (!canAcceptMoneyReferralInvite(referralMe)) {
          skipReason = 'already_referred';
        } else if (!selectMoneyReferralAllowedForGeo(state, result.profileId)) {
          skipReason = 'region_excluded';
        }
        if (skipReason) {
          logSkippedReferral(referralCode, skipReason);
          setStatus('none');
          return;
        }
        setBenefitTitle(
          referralMe?.localized_text?.invitedBenefitTitle?.trim() || null,
        );
        setTermsLink(resolveInviteTermsLink(referralMe?.localized_text));
        setStatus('offered');
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(budgetTimer);
          logSkippedReferral(referralCode, 'read_failed');
          setStatus('none');
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(budgetTimer);
    };
  }, [
    canCheck,
    fetchReferralMe,
    isBasicFunctionalityEnabled,
    pendingReferralCode,
    store,
  ]);

  return { status, pendingReferralCode, benefitTitle, termsLink };
};
