import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxFlexDirection,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import type {
  ReferralLocalizedText,
  ReferredByView,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { useMoneyHeroEntries } from '../../hooks/useMoneyHeroEntries';
import MoneyHeroErrorBanner from './MoneyHeroErrorBanner';
import MoneyHeroIdentityHeader from './MoneyHeroIdentityHeader';
import MoneyMetricCard from './MoneyMetricCard';
import { refereeMoneySections } from '../../../../../reducers/rewardsMoney/selectors';
import { selectIsSocialV1Enabled } from '../../../../../selectors/featureFlagController/socialV1';
import { fillOfferEndsIn } from './fillOfferEndsIn';
import { formatMusdBaseUnits } from '../../utils/formatUtils';
import {
  earnedByOthersLifetime,
  selfEarnedLifetime,
} from '../../utils/earningsSummaryTotals';
import { REFEREE_HERO_CARD_TEST_IDS } from './RefereeHeroCard.testIds';

export { REFEREE_HERO_CARD_TEST_IDS };

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
  const navigation = useNavigation<AppNavigationProp>();
  const showTradingCommissions = useSelector(selectIsSocialV1Enabled);
  const commissionsInfoDescription = localizedText.copyTradingInfoDescription;
  const openCommissionsInfo = useCallback(() => {
    if (!commissionsInfoDescription) {
      return;
    }
    navigation.navigate(Routes.MODAL.REWARDS_INFO_SHEET_MODAL, {
      title: localizedText.tradingCommissionsSection,
      description: commissionsInfoDescription,
    });
  }, [
    commissionsInfoDescription,
    localizedText.tradingCommissionsSection,
    navigation,
  ]);
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
  const sections = refereeMoneySections(referralMeEntry?.data?.roles);
  const showSocialRewards = showTradingCommissions && sections.socialRewards;
  // Cashback copy wins whenever rebates are on, including a combo with
  // COPY_TRADING. A copy-trading-only sharer has no cashback end date, and
  // no identity header: the commissions card's info icon already carries
  // the copy-trading description.
  const copyTradingOnly = sections.socialRewards && !sections.tradingRebates;
  const offerEndsIn = copyTradingOnly
    ? null
    : fillOfferEndsIn(
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
      {copyTradingOnly && !referralCode ? null : (
        <Box
          twClassName="rounded-2xl bg-muted py-4"
          testID={REFEREE_HERO_CARD_TEST_IDS.IDENTITY}
        >
          {copyTradingOnly ? null : (
            <MoneyHeroIdentityHeader
              title={localizedText.invitedBenefitTitle}
              offerEndsIn={offerEndsIn}
              offerEndsTestID={REFEREE_HERO_CARD_TEST_IDS.OFFER_ENDS_IN}
              termsTitle={localizedText.termsTitle}
              termsTestID={REFEREE_HERO_CARD_TEST_IDS.TERMS_INFO_BUTTON}
              titleRowClassName={referralCode ? 'px-4 pb-4' : 'px-4'}
            />
          )}
          {referralCode ? (
            <>
              {copyTradingOnly ? null : (
                <Box twClassName="h-px bg-border-muted" />
              )}
              <Box
                twClassName={copyTradingOnly ? 'px-4' : 'mt-4 px-4'}
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
      )}
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
        {showSocialRewards ? (
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
            onInfoPress={
              commissionsInfoDescription ? openCommissionsInfo : undefined
            }
            testID={REFEREE_HERO_CARD_TEST_IDS.TRADING_COMMISSIONS_TOTAL}
          />
        ) : null}
        {sections.tradingRebates ? (
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
        ) : null}
      </Box>
    </Box>
  );
};

export default RefereeHeroCard;
