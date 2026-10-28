import React, { useState } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type {
  ReferralCodeView,
  ReferralLocalizedText,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { useMoneyHeroEntries } from '../../hooks/useMoneyHeroEntries';
import ShareCodeSheet from './ShareCodeSheet';
import MoneyHeroErrorBanner from './MoneyHeroErrorBanner';
import MoneyHeroIdentityHeader from './MoneyHeroIdentityHeader';
import MoneyMetricCard from './MoneyMetricCard';
import { SHOW_TRADING_COMMISSIONS } from './constants';
import { fillOfferEndsIn } from './fillOfferEndsIn';
import { formatMusdBaseUnits } from '../../utils/formatUtils';
import { earnedByOthersLifetime } from '../../utils/earningsSummaryTotals';

export const REFERER_HERO_CARD_TEST_IDS = {
  CONTAINER: 'referer-hero-card',
  REFERRAL_CODE: 'referer-hero-card-referral-code',
  SHARE_BUTTON: 'referer-hero-card-share-button',
  REFERRALS_TOTAL: 'referer-hero-card-referrals-total',
  TRADE_COMMISSIONS_TOTAL: 'referer-hero-card-trade-commissions-total',
  IDENTITY: 'referer-hero-card-identity',
  OFFER_ENDS_IN: 'referer-hero-card-offer-ends-in',
  TERMS_INFO_BUTTON: 'referer-hero-card-terms-info',
  REFERRAL_ERROR: 'referer-hero-card-referral-error',
  EARNINGS_ERROR: 'referer-hero-card-earnings-error',
} as const;

export interface RefererHeroCardProps {
  profileId: string;
  referralCode: ReferralCodeView | null;
  localizedText: ReferralLocalizedText;
}

/**
 * Referrer hero. The component name intentionally follows the product spelling
 * required by the Money dashboard route.
 *
 * Both totals come from the `earned_by_others` branch: a referrer is paid out
 * of other people's trades, through rev share on the people who used their code
 * and through follow-trade commission on the people who copied them. Their own
 * cashback is a different branch and is not one of these two numbers.
 */
const RefererHeroCard: React.FC<RefererHeroCardProps> = ({
  profileId,
  referralCode,
  localizedText,
}) => {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const {
    referralMeEntry,
    earningsSummary,
    isEarningsLoading,
    unavailableAmount,
    errorSource,
    retry,
    retryLoading,
  } = useMoneyHeroEntries(profileId);
  const code = referralCode?.code?.trim() ?? '';
  const codeStatus =
    referralMeEntry?.data?.referral_code_status ?? referralCode?.status;
  const showShareableCode = codeStatus === 'ACTIVE' && code.length > 0;
  const offerEndsIn = fillOfferEndsIn(
    localizedText,
    referralMeEntry?.data?.earn_rates?.revshare_earning_end,
  );

  return (
    <Box
      twClassName="mt-3 gap-3 px-4 pt-4"
      testID={REFERER_HERO_CARD_TEST_IDS.CONTAINER}
    >
      {errorSource ? (
        <MoneyHeroErrorBanner
          onRetry={retry}
          isRetrying={retryLoading}
          testID={
            errorSource === 'referral'
              ? REFERER_HERO_CARD_TEST_IDS.REFERRAL_ERROR
              : REFERER_HERO_CARD_TEST_IDS.EARNINGS_ERROR
          }
        />
      ) : null}
      {/* Vertical padding only: the divider is full-bleed, so each row carries
          its own horizontal padding. */}
      <Box
        twClassName="rounded-2xl bg-muted py-4"
        testID={REFERER_HERO_CARD_TEST_IDS.IDENTITY}
      >
        <MoneyHeroIdentityHeader
          title={localizedText.earnEligibleFees}
          offerEndsIn={offerEndsIn}
          offerEndsTestID={REFERER_HERO_CARD_TEST_IDS.OFFER_ENDS_IN}
          termsTitle={localizedText.termsTitle}
          termsTestID={REFERER_HERO_CARD_TEST_IDS.TERMS_INFO_BUTTON}
          titleRowClassName="px-4 pb-4"
        />
        <Box twClassName="h-px bg-border-muted" />
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="mt-4 px-4"
        >
          <Box twClassName="min-w-0 flex-1">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {localizedText.yourReferralCode}
            </Text>
            <Text
              variant={TextVariant.HeadingLg}
              testID={REFERER_HERO_CARD_TEST_IDS.REFERRAL_CODE}
            >
              {showShareableCode ? code : '-'}
            </Text>
          </Box>
          {showShareableCode && localizedText.share ? (
            // Button applies `self-start` unless it is full width, which would
            // override the row's centering, so it is wrapped to stay centered.
            <Box>
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Md}
                onPress={() => setIsShareOpen(true)}
                accessibilityLabel={localizedText.share}
                testID={REFERER_HERO_CARD_TEST_IDS.SHARE_BUTTON}
              >
                {localizedText.share}
              </Button>
            </Box>
          ) : null}
        </Box>
      </Box>
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
        <MoneyMetricCard
          iconName={IconName.UserCircleAdd}
          label={localizedText.historyReferrals}
          amount={
            unavailableAmount ??
            formatMusdBaseUnits(
              earnedByOthersLifetime(earningsSummary, 'REFERRAL_REV_SHARE'),
            )
          }
          caption={localizedText.recordedEarnings}
          isLoading={isEarningsLoading}
          testID={REFERER_HERO_CARD_TEST_IDS.REFERRALS_TOTAL}
        />
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
            testID={REFERER_HERO_CARD_TEST_IDS.TRADE_COMMISSIONS_TOTAL}
          />
        ) : null}
      </Box>
      {isShareOpen ? (
        <ShareCodeSheet
          open
          code={referralCode?.code}
          shareUrl={referralCode?.share_url}
          localizedText={localizedText}
          onClose={() => setIsShareOpen(false)}
        />
      ) : null}
    </Box>
  );
};

export default RefererHeroCard;
