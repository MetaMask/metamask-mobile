import React, { useCallback, useMemo } from 'react';
import {
  Box,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import type {
  MoneyAccountSweepstakesLocalizedTextDto,
  MoneyAccountSweepstakesStatsMeDto,
  MoneyAccountSweepstakesTodayStatus,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../../../constants/navigation/Routes';
import { formatUsd } from '../../../utils/formatUtils';
import { StatCell } from '../OndoCampaignStatsSummary';
import { AMOUNT_PLACEHOLDER, ENTRIES_COUNT_PLACEHOLDER } from './constants';

export const MONEY_ACCOUNT_SWEEPSTAKES_STATS_SUMMARY_TEST_IDS = {
  CONTAINER: 'money-account-sweepstakes-stats-summary-container',
  ELIGIBLE_BALANCE: 'money-account-sweepstakes-stats-eligible-balance',
  ENTRIES: 'money-account-sweepstakes-stats-entries',
  CURRENT_BALANCE: 'money-account-sweepstakes-stats-current-balance',
  NEXT_DRAW: 'money-account-sweepstakes-stats-next-draw',
  QUALIFICATION_PROGRESS:
    'money-account-sweepstakes-stats-qualification-progress',
  ELIGIBLE_STATUS_ICON: 'money-account-sweepstakes-stats-eligible-status-icon',
} as const;

interface MoneyAccountSweepstakesStatsSummaryProps {
  stats: MoneyAccountSweepstakesStatsMeDto | null;
  localizedText: MoneyAccountSweepstakesLocalizedTextDto;
  isLoading: boolean;
}

function getEligibleStatusDescription(
  todayStatus: MoneyAccountSweepstakesTodayStatus | undefined,
  localizedText: MoneyAccountSweepstakesLocalizedTextDto,
  shortfallDescription: string,
): string {
  const base = localizedText.eligibleBalanceDescription;
  switch (todayStatus) {
    case 'on_track':
      return `${base} ${localizedText.onTrackDescription}`;
    case 'not_yet_qualified':
      // Still winnable today: depositing the shortfall earns today's entry.
      return `${base} ${shortfallDescription}`;
    case 'lost_today':
      // Reached the threshold and fell below it — today is forfeit.
      return `${base} ${localizedText.lostTodayDescription}`;
    default:
      return base;
  }
}

const MoneyAccountSweepstakesStatsSummary: React.FC<
  MoneyAccountSweepstakesStatsSummaryProps
> = ({ stats, localizedText, isLoading }) => {
  const navigation = useNavigation<AppNavigationProp>();

  const showInfoModal = useCallback(
    (title: string, description: string) => {
      navigation.navigate(Routes.MODAL.REWARDS_INFO_SHEET_MODAL, {
        title,
        description,
      });
    },
    [navigation],
  );

  const showSkeleton = isLoading && !stats;

  // The qualifying figure is net new deposits since joining, not the account
  // balance — it is normally LOWER than the balance, so it is shown against the
  // threshold rather than alone, and the shortfall is spelled out.
  // Deposits net of outflows, never re-valued at the current rate — accrued
  // yield does not count toward the threshold. Outflows ARE valued when they
  // happen, so they carry the yield earned on the position; withdrawing a
  // fully-accrued position can leave the total a few cents below zero. Clamped
  // so the tile never shows a negative figure.
  const qualifyingUsd = stats ? Math.max(0, stats.qualifyingDepositsUsd) : 0;
  const thresholdUsd = stats ? Math.max(0, stats.qualifyingThresholdUsd) : 0;
  const qualifyingDisplay = stats
    ? `${formatUsd(qualifyingUsd)} / ${formatUsd(thresholdUsd)}`
    : '—';
  const currentBalanceDisplay = stats
    ? formatUsd(Math.max(0, stats.currentBalanceUsd))
    : '—';
  const nextDrawDisplay = stats
    ? (stats.daysRemaining === 1
        ? localizedText.dayRemainingValue
        : localizedText.daysRemainingValue
      ).replace(ENTRIES_COUNT_PLACEHOLDER, String(stats.daysRemaining))
    : '—';
  const qualificationShortfall = Math.max(0, thresholdUsd - qualifyingUsd);
  const entriesDisplay = stats
    ? localizedText.entriesCountValue.replace(
        ENTRIES_COUNT_PLACEHOLDER,
        String(stats.entryCount),
      )
    : '—';
  const shortfallDescription = localizedText.shortfallDescription.replace(
    AMOUNT_PLACEHOLDER,
    formatUsd(qualificationShortfall),
  );
  const todayStatus = stats?.todayStatus;
  // `not_yet_qualified` is recoverable today, `lost_today` is not — only the
  // latter is a warning. Treating them alike is what the previous single
  // `below_threshold` status forced.
  const isWarningStatus = todayStatus === 'lost_today';
  const isRecoverable = todayStatus === 'not_yet_qualified';
  const eligibleValueColor = isWarningStatus
    ? TextColor.WarningDefault
    : TextColor.TextDefault;

  const eligibleStatusIcon = useMemo(() => {
    if (!todayStatus) {
      return null;
    }
    if (todayStatus === 'on_track') {
      return (
        <Icon
          name={IconName.Check}
          size={IconSize.Md}
          color={IconColor.SuccessDefault}
          testID={
            MONEY_ACCOUNT_SWEEPSTAKES_STATS_SUMMARY_TEST_IDS.ELIGIBLE_STATUS_ICON
          }
        />
      );
    }
    if (isRecoverable) {
      return (
        <Icon
          name={IconName.Add}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
          testID={
            MONEY_ACCOUNT_SWEEPSTAKES_STATS_SUMMARY_TEST_IDS.ELIGIBLE_STATUS_ICON
          }
        />
      );
    }
    if (isWarningStatus) {
      return (
        <Icon
          name={IconName.Danger}
          size={IconSize.Md}
          color={IconColor.WarningDefault}
          testID={
            MONEY_ACCOUNT_SWEEPSTAKES_STATS_SUMMARY_TEST_IDS.ELIGIBLE_STATUS_ICON
          }
        />
      );
    }
    return null;
  }, [todayStatus, isWarningStatus, isRecoverable]);

  const infoSuffix = (title: string, description: string) => (
    <ButtonIcon
      iconName={IconName.Info}
      iconProps={{ color: IconColor.IconAlternative }}
      size={ButtonIconSize.Xs}
      onPress={() => showInfoModal(title, description)}
    />
  );

  return (
    <Box
      twClassName="gap-3"
      testID={MONEY_ACCOUNT_SWEEPSTAKES_STATS_SUMMARY_TEST_IDS.CONTAINER}
    >
      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label={localizedText.eligibleBalanceTitle}
          value={qualifyingDisplay}
          isLoading={showSkeleton}
          valueColor={eligibleValueColor}
          testID={
            MONEY_ACCOUNT_SWEEPSTAKES_STATS_SUMMARY_TEST_IDS.ELIGIBLE_BALANCE
          }
          suffix={
            !showSkeleton
              ? infoSuffix(
                  localizedText.eligibleBalanceTitle,
                  getEligibleStatusDescription(
                    todayStatus,
                    localizedText,
                    shortfallDescription,
                  ),
                )
              : undefined
          }
          valueSuffix={!showSkeleton ? eligibleStatusIcon : undefined}
        />
        <StatCell
          label={localizedText.entriesTitle}
          value={entriesDisplay}
          isLoading={showSkeleton}
          testID={MONEY_ACCOUNT_SWEEPSTAKES_STATS_SUMMARY_TEST_IDS.ENTRIES}
          suffix={
            !showSkeleton
              ? infoSuffix(
                  localizedText.entriesTitle,
                  localizedText.entriesDescription,
                )
              : undefined
          }
        />
      </Box>
      <Box flexDirection={BoxFlexDirection.Row}>
        <StatCell
          label={localizedText.currentBalanceTitle}
          value={currentBalanceDisplay}
          isLoading={showSkeleton}
          testID={
            MONEY_ACCOUNT_SWEEPSTAKES_STATS_SUMMARY_TEST_IDS.CURRENT_BALANCE
          }
        />
        <StatCell
          label={localizedText.nextDrawTitle}
          value={nextDrawDisplay}
          isLoading={showSkeleton}
          testID={MONEY_ACCOUNT_SWEEPSTAKES_STATS_SUMMARY_TEST_IDS.NEXT_DRAW}
        />
      </Box>
      {!showSkeleton && stats && (
        <Box
          twClassName={
            todayStatus === 'on_track'
              ? 'rounded-xl bg-success-muted p-3'
              : 'rounded-xl bg-muted p-3'
          }
          testID={
            MONEY_ACCOUNT_SWEEPSTAKES_STATS_SUMMARY_TEST_IDS.QUALIFICATION_PROGRESS
          }
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {todayStatus === 'on_track'
              ? localizedText.onTrackDescription
              : todayStatus === 'lost_today'
                ? localizedText.lostTodayDescription
                : shortfallDescription}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default MoneyAccountSweepstakesStatsSummary;
