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
  TextColor,
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
import { ENTRIES_COUNT_PLACEHOLDER } from './constants';

export const MONEY_ACCOUNT_SWEEPSTAKES_STATS_SUMMARY_TEST_IDS = {
  CONTAINER: 'money-account-sweepstakes-stats-summary-container',
  ELIGIBLE_BALANCE: 'money-account-sweepstakes-stats-eligible-balance',
  ENTRIES: 'money-account-sweepstakes-stats-entries',
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
): string {
  const base = localizedText.eligibleBalanceDescription;
  switch (todayStatus) {
    case 'on_track':
      return `${base} ${localizedText.onTrackDescription}`;
    case 'lost_today':
      return `${base} ${localizedText.lostTodayDescription}`;
    case 'below_threshold':
      return `${base} ${localizedText.belowThresholdDescription}`;
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

  const eligibleBalanceDisplay = stats ? formatUsd(stats.todayMinUsd) : '—';
  const entriesDisplay = stats
    ? localizedText.entriesCountValue.replace(
        ENTRIES_COUNT_PLACEHOLDER,
        String(stats.entryCount),
      )
    : '—';

  const todayStatus = stats?.todayStatus;
  const isWarningStatus =
    todayStatus === 'lost_today' || todayStatus === 'below_threshold';
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
  }, [todayStatus, isWarningStatus]);

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
          value={eligibleBalanceDisplay}
          isLoading={showSkeleton}
          valueColor={eligibleValueColor}
          testID={
            MONEY_ACCOUNT_SWEEPSTAKES_STATS_SUMMARY_TEST_IDS.ELIGIBLE_BALANCE
          }
          suffix={
            !showSkeleton
              ? infoSuffix(
                  localizedText.eligibleBalanceTitle,
                  getEligibleStatusDescription(todayStatus, localizedText),
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
    </Box>
  );
};

export default MoneyAccountSweepstakesStatsSummary;
