import React from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type {
  EarningsSummaryDto,
  ReferralLocalizedText,
  ReferredByView,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import type { RootState } from '../../../../../reducers';
import {
  selectEarningsSummaryEntry,
  selectReferralMeEntry,
} from '../../../../../reducers/rewardsMoney/selectors';
import { strings } from '../../../../../../locales/i18n';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { useEarningsSummary } from '../../hooks/useEarningsSummary';
import { useReferralMe } from '../../hooks/useReferralMe';
import MoneyMetricCard from './MoneyMetricCard';
import { formatMusdBaseUnits } from '../../utils/formatUtils';
import {
  earnedByOthersLifetime,
  selfEarnedLifetime,
} from '../../utils/earningsSummaryTotals';

export const REFEREE_HERO_CARD_TEST_IDS = {
  CONTAINER: 'referee-hero-card',
  REFERRAL_CODE: 'referee-hero-card-referral-code',
  TRADING_COMMISSIONS_TOTAL: 'referee-hero-card-trading-commissions-total',
  TRADING_REBATES_TOTAL: 'referee-hero-card-trading-rebates-total',
  IDENTITY: 'referee-hero-card-identity',
  REFERRAL_ERROR: 'referee-hero-card-referral-error',
  EARNINGS_ERROR: 'referee-hero-card-earnings-error',
} as const;

export interface RefereeHeroCardProps {
  profileId: string;
  referredBy: ReferredByView | null;
  localizedText: ReferralLocalizedText;
}

/**
 * Invited hero. Mirrors the referrer card's shape so the two personas read as
 * the same screen, but the totals split across both branches: rebates are the
 * cashback on the referee's own trades, while commission is what other people
 * copying those trades earned them.
 */
const RefereeHeroCard: React.FC<RefereeHeroCardProps> = ({
  profileId,
  referredBy,
  localizedText,
}) => {
  const referralMeEntry = useSelector((state: RootState) =>
    selectReferralMeEntry(state, profileId),
  );
  const earningsSummaryEntry = useSelector((state: RootState) =>
    selectEarningsSummaryEntry(state, profileId),
  );
  const { fetchReferralMe } = useReferralMe({ fetchOnMount: false });
  const { fetchEarningsSummary } = useEarningsSummary(profileId);
  const earningsSummary: EarningsSummaryDto | null =
    earningsSummaryEntry?.data ?? null;
  const isEarningsLoading =
    !earningsSummary &&
    (!earningsSummaryEntry || Boolean(earningsSummaryEntry.loading));
  const unavailableAmount =
    Boolean(earningsSummaryEntry?.error) && !earningsSummary ? '-' : null;
  const errorSource = referralMeEntry?.error
    ? 'referral'
    : earningsSummaryEntry?.error
      ? 'earnings'
      : null;
  const referralCode = referredBy?.referral_code?.trim() ?? '';

  return (
    <Box
      twClassName="mt-3 gap-3 px-4 pt-4"
      testID={REFEREE_HERO_CARD_TEST_IDS.CONTAINER}
    >
      {errorSource ? (
        <RewardsErrorBanner
          title={strings('rewards.referral_details_error.error_fetching_title')}
          description={strings(
            'rewards.referral_details_error.error_fetching_description',
          )}
          onConfirm={() =>
            errorSource === 'referral'
              ? fetchReferralMe({ forceFresh: true })
              : fetchEarningsSummary({ forceFresh: true })
          }
          confirmButtonLabel={strings(
            'rewards.referral_details_error.retry_button',
          )}
          onConfirmLoading={
            errorSource === 'referral'
              ? Boolean(referralMeEntry?.loading)
              : Boolean(earningsSummaryEntry?.loading)
          }
          testID={
            errorSource === 'referral'
              ? REFEREE_HERO_CARD_TEST_IDS.REFERRAL_ERROR
              : REFEREE_HERO_CARD_TEST_IDS.EARNINGS_ERROR
          }
        />
      ) : null}
      <Box
        twClassName="rounded-2xl bg-muted py-4"
        testID={REFEREE_HERO_CARD_TEST_IDS.IDENTITY}
      >
        <Box twClassName="px-4 pb-4">
          <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
            {localizedText.invitedBenefitTitle}
          </Text>
        </Box>
        <Box twClassName="h-px bg-border-muted" />
        <Box twClassName="mt-4 px-4">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {localizedText.invitedReferredBy}
          </Text>
          {referralCode ? (
            <Text
              variant={TextVariant.HeadingLg}
              testID={REFEREE_HERO_CARD_TEST_IDS.REFERRAL_CODE}
            >
              {referralCode}
            </Text>
          ) : null}
        </Box>
      </Box>
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
        <MoneyMetricCard
          iconName={IconName.SwapVertical}
          label={localizedText.tradingCommissionsSection}
          amount={
            unavailableAmount ??
            formatMusdBaseUnits(
              earnedByOthersLifetime(earningsSummary, 'SOCIAL_FOLLOW_TRADE'),
            )
          }
          caption={localizedText.recordedEarnings}
          isLoading={isEarningsLoading}
          testID={REFEREE_HERO_CARD_TEST_IDS.TRADING_COMMISSIONS_TOTAL}
        />
        <MoneyMetricCard
          iconName={IconName.Coin}
          label={localizedText.tradingRebates}
          amount={
            unavailableAmount ??
            formatMusdBaseUnits(
              selfEarnedLifetime(
                earningsSummary,
                'REFERRAL_TRADE_FEE_CASHBACK',
              ),
            )
          }
          caption={localizedText.recordedEarnings}
          isLoading={isEarningsLoading}
          testID={REFEREE_HERO_CARD_TEST_IDS.TRADING_REBATES_TOTAL}
        />
      </Box>
    </Box>
  );
};

export default RefereeHeroCard;
