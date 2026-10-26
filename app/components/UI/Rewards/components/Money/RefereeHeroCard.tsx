import React from 'react';
import {
  Box,
  BoxFlexDirection,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type {
  ReferralLocalizedText,
  ReferredByView,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { useMoneyHeroEntries } from '../../hooks/useMoneyHeroEntries';
import MoneyHeroErrorBanner from './MoneyHeroErrorBanner';
import MoneyHeroIdentityHeader from './MoneyHeroIdentityHeader';
import MoneyMetricCard from './MoneyMetricCard';
import { SHOW_TRADING_COMMISSIONS } from './constants';
import { fillOfferEndsIn } from './fillOfferEndsIn';
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
  OFFER_ENDS_IN: 'referee-hero-card-offer-ends-in',
  REFERRED_BY: 'referee-hero-card-referred-by',
  TERMS_INFO_BUTTON: 'referee-hero-card-terms-info',
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
  const {
    referralMeEntry,
    earningsSummary,
    isEarningsLoading,
    unavailableAmount,
    errorSource,
    retry,
    retryLoading,
  } = useMoneyHeroEntries(profileId);
  const referralCode = referredBy?.referral_code?.trim() ?? '';
  const offerEndsIn = fillOfferEndsIn(
    localizedText,
    referralMeEntry?.data?.earn_rates?.cashback_earning_end,
  );

  return (
    <Box
      twClassName="mt-3 gap-3 px-4 pt-4"
      testID={REFEREE_HERO_CARD_TEST_IDS.CONTAINER}
    >
      {errorSource ? (
        <MoneyHeroErrorBanner
          onRetry={retry}
          isRetrying={retryLoading}
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
        <MoneyHeroIdentityHeader
          title={localizedText.invitedBenefitTitle}
          offerEndsIn={offerEndsIn}
          offerEndsTestID={REFEREE_HERO_CARD_TEST_IDS.OFFER_ENDS_IN}
          termsTitle={localizedText.termsTitle}
          termsTestID={REFEREE_HERO_CARD_TEST_IDS.TERMS_INFO_BUTTON}
          titleRowClassName={referralCode ? 'px-4 pb-4' : 'px-4'}
        />
        {referralCode ? (
          <>
            <Box twClassName="h-px bg-border-muted" />
            <Box
              twClassName="mt-4 px-4"
              testID={REFEREE_HERO_CARD_TEST_IDS.REFERRED_BY}
            >
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {localizedText.invitedReferredBy}
              </Text>
              <Text
                variant={TextVariant.HeadingLg}
                testID={REFEREE_HERO_CARD_TEST_IDS.REFERRAL_CODE}
              >
                {referralCode}
              </Text>
            </Box>
          </>
        ) : null}
      </Box>
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
        {SHOW_TRADING_COMMISSIONS ? (
          <MoneyMetricCard
            iconName={IconName.Copy}
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
        ) : null}
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
