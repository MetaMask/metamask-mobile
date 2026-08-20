import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type {
  CampaignDto,
  MoneyAccountSweepstakesLocalizedTextDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { useGetMoneyAccountSweepstakesDrawProof } from '../../../hooks/useGetMoneyAccountSweepstakesDrawProof';
import { useGetMoneyAccountSweepstakesPrizePool } from '../../../hooks/useGetMoneyAccountSweepstakesPrizePool';
import { useMoneyAccountSweepstakesOutcome } from '../../../hooks/useMoneyAccountSweepstakesOutcome';
import { strings } from '../../../../../../../locales/i18n';
import {
  formatCampaignDateRange,
  getCampaignStatus,
} from '../CampaignTile.utils';
import { formatUsd } from '../../../utils/formatUtils';
import {
  ENTRIES_COUNT_PLACEHOLDER,
  WEEK_NUMBER_PLACEHOLDER,
} from './constants';

export const MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS = {
  CONTAINER: 'money-account-sweepstakes-draw-schedule-container',
  WEEK_ROW: 'money-account-sweepstakes-draw-schedule-week-row',
  WINNER_BUTTON: 'money-account-sweepstakes-draw-schedule-winner-button',
} as const;

interface MoneyAccountSweepstakesDrawScheduleSectionProps {
  campaigns: CampaignDto[];
  localizedText: MoneyAccountSweepstakesLocalizedTextDto;
  entryCount?: number;
  isParticipating?: boolean;
  /** Open winner details for a won week (parent handles navigation). */
  onOpenWinnerDetails?: (campaign: CampaignDto) => void;
}

const formatWeekTitle = (
  weekTitleTemplate: string,
  weekNumber: number,
): string =>
  weekTitleTemplate.replace(WEEK_NUMBER_PLACEHOLDER, String(weekNumber));

interface WeekRowProps {
  campaign: CampaignDto;
  weekNumber: number;
  localizedText: MoneyAccountSweepstakesLocalizedTextDto;
  entryCount?: number;
  isParticipating?: boolean;
  onOpenWinnerDetails?: (campaign: CampaignDto) => void;
}

const WeekRow: React.FC<WeekRowProps> = ({
  campaign,
  weekNumber,
  localizedText,
  entryCount,
  isParticipating = false,
  onOpenWinnerDetails,
}) => {
  const status = getCampaignStatus(campaign);
  const { drawProof } = useGetMoneyAccountSweepstakesDrawProof(
    campaign.id,
    status === 'complete',
  );
  const { prizePool } = useGetMoneyAccountSweepstakesPrizePool(campaign.id);
  const { outcome } = useMoneyAccountSweepstakesOutcome(
    status === 'complete' ? campaign.id : undefined,
  );

  const weekTitle = formatWeekTitle(localizedText.weekTitle, weekNumber);
  const dateRange = formatCampaignDateRange(
    campaign.startDate,
    campaign.endDate,
  );

  const openWinnerDetails = useCallback(() => {
    onOpenWinnerDetails?.(campaign);
  }, [campaign, onOpenWinnerDetails]);

  const rowTestId = `${MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS.WEEK_ROW}-${campaign.id}`;
  const formattedPrizePoolAmount =
    prizePool?.unlockedPoolUsd != null
      ? formatUsd(prizePool.unlockedPoolUsd)
      : null;
  const prizePoolLabel = localizedText.prizePoolLabel;

  if (status === 'complete') {
    const hasProof = drawProof != null;
    const hasWon = Boolean(outcome?.winnerVerificationCode);
    const isOutcomeFinalized = outcome?.outcomeStatus === 'finalized';

    return (
      <Box twClassName="flex-row gap-4 py-3" testID={rowTestId}>
        <Box twClassName="flex-1 gap-1">
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {dateRange}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {weekTitle}
          </Text>
        </Box>
        <Box alignItems={BoxAlignItems.End} twClassName="flex-1 gap-1">
          {formattedPrizePoolAmount != null && (
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {formattedPrizePoolAmount}
            </Text>
          )}
          {hasWon ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isOutcomeFinalized }}
              disabled={isOutcomeFinalized}
              onPress={openWinnerDetails}
              testID={`${MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS.WINNER_BUTTON}-${campaign.id}`}
            >
              <Box twClassName="rounded-md bg-success-muted px-2 py-1">
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.SuccessDefault}
                >
                  {strings('rewards.campaign_winning.you_won')}
                </Text>
              </Box>
            </Pressable>
          ) : hasProof ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {localizedText.drawCompleteTitle}
            </Text>
          ) : (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {localizedText.drawPendingTitle}
            </Text>
          )}
        </Box>
      </Box>
    );
  }

  if (status === 'active') {
    return (
      <Box twClassName="flex-row gap-4 py-3" testID={rowTestId}>
        <Box twClassName="flex-1 gap-1">
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {dateRange}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.SuccessDefault}>
            {weekTitle} · {localizedText.drawScheduleCurrentDraw}
          </Text>
        </Box>
        <Box alignItems={BoxAlignItems.End} twClassName="flex-1 gap-1">
          {formattedPrizePoolAmount != null && (
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {formattedPrizePoolAmount}
            </Text>
          )}
          {isParticipating ? (
            <Text variant={TextVariant.BodySm} color={TextColor.SuccessDefault}>
              {localizedText.entriesCountValue.replace(
                ENTRIES_COUNT_PLACEHOLDER,
                entryCount == null ? '-' : String(entryCount),
              )}
            </Text>
          ) : (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {prizePoolLabel}
            </Text>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box twClassName="flex-row gap-4 py-3" testID={rowTestId}>
      <Box twClassName="flex-1 gap-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {dateRange}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {weekTitle}
        </Text>
      </Box>
      <Box alignItems={BoxAlignItems.End} twClassName="flex-1 gap-1">
        {formattedPrizePoolAmount != null && (
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {formattedPrizePoolAmount}
          </Text>
        )}
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {prizePoolLabel}
        </Text>
      </Box>
    </Box>
  );
};

const MoneyAccountSweepstakesDrawScheduleSection: React.FC<
  MoneyAccountSweepstakesDrawScheduleSectionProps
> = ({
  campaigns,
  localizedText,
  entryCount,
  isParticipating,
  onOpenWinnerDetails,
}) => {
  if (campaigns.length === 0) {
    return null;
  }

  return (
    <Box
      twClassName="gap-0"
      testID={MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS.CONTAINER}
    >
      <Box twClassName="gap-1 pb-3">
        <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
          {localizedText.drawScheduleTitle}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {localizedText.drawScheduleSummary}
        </Text>
      </Box>

      {campaigns.map((campaign, index) => (
        <React.Fragment key={campaign.id}>
          <WeekRow
            campaign={campaign}
            weekNumber={index + 1}
            localizedText={localizedText}
            entryCount={entryCount}
            isParticipating={isParticipating}
            onOpenWinnerDetails={onOpenWinnerDetails}
          />
        </React.Fragment>
      ))}

      <Box twClassName="border-t border-border-muted pt-3">
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {localizedText.drawScheduleEntriesReset}
        </Text>
      </Box>
    </Box>
  );
};

export default MoneyAccountSweepstakesDrawScheduleSection;
