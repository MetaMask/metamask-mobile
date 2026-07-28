import React, { useCallback } from 'react';
import {
  Box,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  ButtonVariant,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import type {
  MoneyAccountSweepstakesLocalizedTextDto,
  MoneyAccountSweepstakesStatsMeDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../../../constants/navigation/Routes';
import { formatUsd } from '../../../utils/formatUtils';
import { ModalType } from '../../RewardsBottomSheetModal';
import { StatCell } from '../OndoCampaignStatsSummary';
import { strings } from '../../../../../../../locales/i18n';
import { ENTRIES_COUNT_PLACEHOLDER } from './constants';

export const MONEY_ACCOUNT_SWEEPSTAKES_STATS_SUMMARY_TEST_IDS = {
  CONTAINER: 'money-account-sweepstakes-stats-summary-container',
  CURRENT_BALANCE: 'money-account-sweepstakes-stats-current-balance',
  ELIGIBLE_BALANCE: 'money-account-sweepstakes-stats-eligible-balance',
  ENTRIES: 'money-account-sweepstakes-stats-entries',
} as const;

interface MoneyAccountSweepstakesStatsSummaryProps {
  stats: MoneyAccountSweepstakesStatsMeDto | null;
  localizedText: MoneyAccountSweepstakesLocalizedTextDto;
  isLoading: boolean;
}

const MoneyAccountSweepstakesStatsSummary: React.FC<
  MoneyAccountSweepstakesStatsSummaryProps
> = ({ stats, localizedText, isLoading }) => {
  const navigation = useNavigation<AppNavigationProp>();

  const showInfoModal = useCallback(
    (title: string, description: string) => {
      navigation.navigate(Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL, {
        title,
        description,
        type: ModalType.Confirmation,
        confirmAction: {
          label: strings('rewards.upcoming_rewards.cta_label'),
          onPress: () => {
            // dismiss only
          },
          variant: ButtonVariant.Primary,
        },
        showCancelButton: true,
        cancelMode: 'top-right-cross-icon',
      });
    },
    [navigation],
  );

  const showSkeleton = isLoading && !stats;

  const currentBalanceDisplay = stats
    ? formatUsd(stats.currentBalanceUsd)
    : '—';
  const eligibleBalanceDisplay = stats ? formatUsd(stats.todayMinUsd) : '—';
  const entriesDisplay = stats
    ? localizedText.entriesCountValue.replace(
        ENTRIES_COUNT_PLACEHOLDER,
        String(stats.entryCount),
      )
    : '—';

  const infoSuffix = (title: string, description: string) => (
    <ButtonIcon
      iconName={IconName.Info}
      iconProps={{ color: IconColor.IconAlternative }}
      size={ButtonIconSize.Sm}
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
          label={localizedText.currentBalanceTitle}
          value={currentBalanceDisplay}
          isLoading={showSkeleton}
          testID={
            MONEY_ACCOUNT_SWEEPSTAKES_STATS_SUMMARY_TEST_IDS.CURRENT_BALANCE
          }
          suffix={
            !showSkeleton
              ? infoSuffix(
                  localizedText.currentBalanceTitle,
                  localizedText.currentBalanceDescription,
                )
              : undefined
          }
        />
        <StatCell
          label={localizedText.eligibleBalanceTitle}
          value={eligibleBalanceDisplay}
          isLoading={showSkeleton}
          testID={
            MONEY_ACCOUNT_SWEEPSTAKES_STATS_SUMMARY_TEST_IDS.ELIGIBLE_BALANCE
          }
          suffix={
            !showSkeleton
              ? infoSuffix(
                  localizedText.eligibleBalanceTitle,
                  localizedText.eligibleBalanceDescription,
                )
              : undefined
          }
        />
      </Box>
      <Box flexDirection={BoxFlexDirection.Row}>
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
