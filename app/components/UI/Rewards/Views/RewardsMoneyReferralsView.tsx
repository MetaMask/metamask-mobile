import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { IconName } from '@metamask/design-system-react-native';
import type { RootState } from '../../../../reducers';
import {
  selectReferralFunnelEntry,
  selectReferralMeEntry,
  selectReferralMeLocalizedText,
} from '../../../../reducers/rewardsMoney/selectors';
import { selectSessionProfileId } from '../../../../selectors/identity';
import type { LedgerEarningEntryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { EarningsHistoryRow } from '../components/Money/EarningsHistoryRows';
import EarnPageHeader from '../components/Money/EarnPageHeader';
import RewardsMoneyListScreen from '../components/Money/RewardsMoneyListScreen';
import ShareCodeSheet from '../components/Money/ShareCodeSheet';
import TradingActivityListView from '../components/Money/TradingActivityListView';
import { useReferralEarningsLedger } from '../hooks/useReferralEarningsLedger';
import { useReferralFunnel } from '../hooks/useReferralFunnel';
import { isShareableReferralCode } from '../utils/shareableReferralCode';

export const REWARDS_MONEY_REFERRALS_VIEW_TEST_IDS = {
  CONTAINER: 'rewards-money-referrals-view',
  LIST: 'rewards-money-referrals-list',
} as const;

/** Shown for a funnel count that is still loading or failed to load. */
const FUNNEL_UNAVAILABLE = '—';

const RewardsMoneyReferralsView: React.FC = () => {
  const profileId = useSelector(selectSessionProfileId);
  const localizedText = useSelector((state: RootState) =>
    selectReferralMeLocalizedText(state, profileId),
  );
  const referralMe = useSelector(
    (state: RootState) => selectReferralMeEntry(state, profileId)?.data,
  );
  const funnelEntry = useSelector((state: RootState) =>
    selectReferralFunnelEntry(state, profileId),
  );
  const funnel = funnelEntry?.data;
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { fetchReferralFunnel } = useReferralFunnel(profileId);
  const retryFunnel = useCallback(() => {
    void fetchReferralFunnel({ forceFresh: true });
  }, [fetchReferralFunnel]);
  const list = useReferralEarningsLedger(profileId);

  // The same rule as the dashboard's Share button: no usable code, no share.
  const canShareCode = isShareableReferralCode(
    referralMe?.referral_code,
    referralMe?.referral_code_status,
  );
  const code = referralMe?.referral_code?.code?.trim() ?? '';
  const openShare = useCallback(() => setIsShareOpen(true), []);
  const closeShare = useCallback(() => setIsShareOpen(false), []);

  const renderItem = useCallback(
    (item: LedgerEarningEntryDto) =>
      localizedText ? (
        <EarningsHistoryRow item={item} localizedText={localizedText} />
      ) : null,
    [localizedText],
  );

  return (
    <RewardsMoneyListScreen
      view="RewardsMoneyReferralsView"
      title={localizedText?.referFriends ?? ''}
      testID={REWARDS_MONEY_REFERRALS_VIEW_TEST_IDS.CONTAINER}
    >
      {profileId && localizedText ? (
        <>
          <TradingActivityListView
            testIDs={REWARDS_MONEY_REFERRALS_VIEW_TEST_IDS}
            list={list}
            renderItem={renderItem}
            header={
              <EarnPageHeader
                profileId={profileId}
                localizedText={localizedText}
                title={localizedText.earnEligibleFees}
                description={localizedText.earnEligibleFeesDescription}
                cta={
                  canShareCode
                    ? { label: localizedText.shareCode, onPress: openShare }
                    : undefined
                }
                ctaSubtext={
                  canShareCode
                    ? `${localizedText.inviteReferralCode} ${code}`
                    : undefined
                }
                branch="earned_by_others"
                family="REFERRAL_REV_SHARE"
                funnelFailed={Boolean(funnelEntry?.error)}
                funnelRefreshing={Boolean(funnelEntry?.loading)}
                onRetryFunnel={retryFunnel}
                extraRows={[
                  {
                    key: 'confirmed',
                    label: localizedText.funnelConfirmed,
                    value: funnel
                      ? String(funnel.enrolled)
                      : FUNNEL_UNAVAILABLE,
                    iconName: IconName.UserCheck,
                    placement: 'before',
                  },
                  {
                    key: 'feeGenerating',
                    label: localizedText.funnelFeeGenerating,
                    value: funnel
                      ? String(funnel.earning_generating)
                      : FUNNEL_UNAVAILABLE,
                    iconName: IconName.Coin,
                    placement: 'before',
                  },
                ]}
              />
            }
          />
          {isShareOpen && canShareCode ? (
            <ShareCodeSheet
              open
              code={referralMe?.referral_code?.code}
              shareUrl={referralMe?.referral_code?.share_url}
              localizedText={localizedText}
              onClose={closeShare}
            />
          ) : null}
        </>
      ) : null}
    </RewardsMoneyListScreen>
  );
};

export default RewardsMoneyReferralsView;
