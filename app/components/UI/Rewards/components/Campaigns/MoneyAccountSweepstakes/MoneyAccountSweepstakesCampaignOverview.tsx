import React, { type ReactNode } from 'react';
import { ImageBackground } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type {
  CampaignDto,
  MoneyAccountSweepstakesLocalizedTextDto,
  MoneyAccountSweepstakesStatsMeDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { formatUsd } from '../../../utils/formatUtils';
import { AMOUNT_PLACEHOLDER, ENTRIES_COUNT_PLACEHOLDER } from './constants';
import RewardsErrorBanner from '../../RewardsErrorBanner';
import { strings } from '../../../../../../../locales/i18n';
import useMoneyAccountBalance from '../../../../Money/hooks/useMoneyAccountBalance';

export const MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_OVERVIEW_TEST_IDS = {
  CONTAINER: 'campaign-status',
  BALANCE_HEADER: 'money-account-sweepstakes-balance-header',
  HERO: 'money-account-sweepstakes-hero',
  STATS_LOADING: 'money-account-sweepstakes-stats-loading',
  STATS_ERROR: 'money-account-sweepstakes-stats-error',
  MONEY_ACCOUNT_BALANCE_ROW:
    'money-account-sweepstakes-money-account-balance-row',
} as const;

interface MoneyAccountSweepstakesCampaignOverviewProps {
  campaign: CampaignDto;
  localizedText: MoneyAccountSweepstakesLocalizedTextDto;
  isParticipating?: boolean;
  stats?: MoneyAccountSweepstakesStatsMeDto | null;
  isStatsLoading?: boolean;
  hasStatsError?: boolean;
  onRetryStats?: () => void;
  children?: ReactNode;
}

const MoneyAccountSweepstakesCampaignOverview: React.FC<
  MoneyAccountSweepstakesCampaignOverviewProps
> = ({
  campaign,
  localizedText,
  isParticipating = false,
  stats,
  isStatsLoading = false,
  hasStatsError = false,
  onRetryStats,
  children,
}) => {
  const tw = useTailwind();
  const backgroundImageUrl = campaign.image?.lightModeUrl;
  const { totalFiatFormatted, lastKnownTotalFiatFormatted, isBalanceLoading } =
    useMoneyAccountBalance();

  if (isParticipating) {
    const showStatsLoading = isStatsLoading && !stats;
    const showStatsError = hasStatsError && !stats;

    if (showStatsError) {
      return (
        <Box
          twClassName="px-4 pb-5 pt-4"
          testID={
            MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_OVERVIEW_TEST_IDS.CONTAINER
          }
        >
          <RewardsErrorBanner
            title={strings('rewards.campaign_details.stats_error_title')}
            description={strings(
              'rewards.campaign_details.stats_error_description',
            )}
            onConfirm={onRetryStats}
            confirmButtonLabel={strings('rewards.campaign_details.retry')}
            testID={
              MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_OVERVIEW_TEST_IDS.STATS_ERROR
            }
          />
        </Box>
      );
    }

    if (showStatsLoading) {
      return (
        <Box
          twClassName="px-4 pb-5 pt-4"
          testID={
            MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_OVERVIEW_TEST_IDS.CONTAINER
          }
        >
          <Box
            twClassName="gap-3 rounded-xl bg-muted p-4"
            testID={
              MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_OVERVIEW_TEST_IDS.STATS_LOADING
            }
          >
            <Skeleton style={tw.style('h-5 w-40 rounded-md')} />
            <Skeleton style={tw.style('h-10 w-36 rounded-md')} />
            <Skeleton style={tw.style('h-6 w-28 rounded-md')} />
            <Skeleton style={tw.style('h-4 w-full rounded-md')} />
            {children}
          </Box>
        </Box>
      );
    }

    const balanceDisplay = stats
      ? formatUsd(Math.max(0, stats.qualifyingDepositsUsd))
      : '—';
    const entriesDisplay = stats
      ? localizedText.entriesCountValue.replace(
          ENTRIES_COUNT_PLACEHOLDER,
          String(stats.entryCount),
        )
      : '—';
    const isQualified = stats?.todayStatus === 'on_track';
    const remainingBalance = stats
      ? Math.max(0, stats.qualifyingThresholdUsd - stats.qualifyingDepositsUsd)
      : 0;
    const qualificationMessage = (() => {
      switch (stats?.todayStatus) {
        case 'on_track':
          return localizedText.onTrackDescription;
        case 'not_yet_qualified':
          return localizedText.shortfallDescription.replace(
            AMOUNT_PLACEHOLDER,
            formatUsd(remainingBalance),
          );
        case 'lost_today':
          return localizedText.lostTodayDescription;
        // No day-close verdict exists off the scored set, so there is nothing
        // truthful to promise or warn about. Deliberately silent rather than
        // reusing the shortfall copy: `qualifyingDepositsUsd` may already
        // cover the threshold, which rendered as "Add $0 today to earn
        // today's entry". The figure and entry count above still show.
        case 'not_scored':
          return null;
        default:
          return null;
      }
    })();
    const isPaused = stats?.todayStatus === 'lost_today';
    const moneyAccountBalanceDisplay =
      totalFiatFormatted ?? lastKnownTotalFiatFormatted ?? '—';
    const showMoneyAccountBalanceSkeleton =
      isBalanceLoading &&
      totalFiatFormatted === undefined &&
      lastKnownTotalFiatFormatted === undefined;

    return (
      <Box
        twClassName="px-4 pb-5 pt-4"
        testID={MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_OVERVIEW_TEST_IDS.CONTAINER}
      >
        <Box
          twClassName="gap-3 rounded-xl bg-muted p-4"
          testID={
            MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_OVERVIEW_TEST_IDS.BALANCE_HEADER
          }
        >
          <Box
            alignItems={BoxAlignItems.Center}
            flexDirection={BoxFlexDirection.Row}
            twClassName="gap-2"
          >
            <Text variant={TextVariant.HeadingSm}>
              {localizedText.eligibleBalanceTitle}
            </Text>
            {isQualified && (
              <Box twClassName="rounded-md bg-success-muted px-2 py-1">
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.SuccessDefault}
                >
                  {localizedText.qualifiedLabel}
                </Text>
              </Box>
            )}
          </Box>
          <Text variant={TextVariant.DisplayLg} fontWeight={FontWeight.Bold}>
            {balanceDisplay}
          </Text>
          <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-1">
            <Text
              variant={TextVariant.BodyLg}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
            >
              {entriesDisplay}
            </Text>
            <Text
              variant={TextVariant.BodyLg}
              color={TextColor.TextAlternative}
            >
              · {localizedText.thisWeekLabel}
            </Text>
          </Box>
          {qualificationMessage && (
            <Text
              variant={TextVariant.BodySm}
              color={
                isQualified
                  ? TextColor.SuccessDefault
                  : isPaused
                    ? TextColor.WarningDefault
                    : TextColor.TextAlternative
              }
            >
              {qualificationMessage}
            </Text>
          )}
          <Box twClassName="border-t border-border-muted" />
          <Box
            alignItems={BoxAlignItems.Center}
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            testID={
              MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_OVERVIEW_TEST_IDS.MONEY_ACCOUNT_BALANCE_ROW
            }
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {localizedText.balanceTitle}
            </Text>
            {showMoneyAccountBalanceSkeleton ? (
              <Skeleton style={tw.style('h-5 w-20 rounded-md')} />
            ) : (
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {moneyAccountBalanceDisplay}
              </Text>
            )}
          </Box>
          {children}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      twClassName="px-4 pb-5 pt-4"
      testID={MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_OVERVIEW_TEST_IDS.CONTAINER}
    >
      <Box twClassName="h-32 overflow-hidden rounded-xl border border-border-muted bg-black">
        <ImageBackground
          source={{ uri: backgroundImageUrl }}
          resizeMode="cover"
          style={tw.style('h-full w-full')}
          testID={MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_OVERVIEW_TEST_IDS.HERO}
        />
      </Box>
      <Box twClassName="gap-1 pt-4">
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
        >
          {localizedText.prizeTitle}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {localizedText.prizeDescription}
        </Text>
      </Box>
    </Box>
  );
};

export default MoneyAccountSweepstakesCampaignOverview;
