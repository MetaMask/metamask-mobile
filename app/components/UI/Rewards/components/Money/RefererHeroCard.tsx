import React, { useState } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type {
  EarningsSummaryDto,
  ReferralCodeView,
  ReferralLocalizedText,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import ShareCodeSheet from './ShareCodeSheet';
import MoneyMetricCard from './MoneyMetricCard';
import { formatMusdBaseUnits } from '../../utils/formatUtils';
import { earnedByOthersLifetime } from '../../utils/earningsSummaryTotals';

export const REFERER_HERO_CARD_TEST_IDS = {
  CONTAINER: 'referer-hero-card',
  REFERRAL_CODE: 'referer-hero-card-referral-code',
  SHARE_BUTTON: 'referer-hero-card-share-button',
  REFERRALS_TOTAL: 'referer-hero-card-referrals-total',
  TRADE_COMMISSIONS_TOTAL: 'referer-hero-card-trade-commissions-total',
} as const;

export interface RefererHeroCardProps {
  referralCode: ReferralCodeView | null;
  localizedText: ReferralLocalizedText;
  earningsSummary: EarningsSummaryDto | null;
  isEarningsLoading: boolean;
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
  referralCode,
  localizedText,
  earningsSummary,
  isEarningsLoading,
}) => {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const code = referralCode?.code?.trim() ?? '';

  return (
    <Box
      twClassName="mt-3 gap-3 px-4 pt-4"
      testID={REFERER_HERO_CARD_TEST_IDS.CONTAINER}
    >
      {/* Vertical padding only: the divider is full-bleed, so each row carries
          its own horizontal padding. */}
      <Box twClassName="rounded-2xl bg-muted py-4">
        <Box twClassName="px-4 pb-4">
          <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
            {localizedText.earnEligibleFees}
          </Text>
        </Box>
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
            {code ? (
              <Text
                variant={TextVariant.HeadingLg}
                testID={REFERER_HERO_CARD_TEST_IDS.REFERRAL_CODE}
              >
                {code}
              </Text>
            ) : null}
          </Box>
          {code && localizedText.share ? (
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
          amount={formatMusdBaseUnits(
            earnedByOthersLifetime(earningsSummary, 'REFERRAL_REV_SHARE'),
          )}
          caption={localizedText.recordedEarnings}
          isLoading={isEarningsLoading}
          testID={REFERER_HERO_CARD_TEST_IDS.REFERRALS_TOTAL}
        />
        <MoneyMetricCard
          iconName={IconName.SwapVertical}
          label={localizedText.tradeCommissions}
          amount={formatMusdBaseUnits(
            earnedByOthersLifetime(earningsSummary, 'SOCIAL_FOLLOW_TRADE'),
          )}
          caption={localizedText.recordedEarnings}
          isLoading={isEarningsLoading}
          testID={REFERER_HERO_CARD_TEST_IDS.TRADE_COMMISSIONS_TOTAL}
        />
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
