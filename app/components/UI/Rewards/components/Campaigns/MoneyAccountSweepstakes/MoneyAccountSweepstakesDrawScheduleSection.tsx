import React, { useCallback } from 'react';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type {
  CampaignDto,
  MoneyAccountSweepstakesDrawProofDto,
  MoneyAccountSweepstakesLocalizedTextDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { useGetMoneyAccountSweepstakesDrawProof } from '../../../hooks/useGetMoneyAccountSweepstakesDrawProof';
import { useGetMoneyAccountSweepstakesPrizePool } from '../../../hooks/useGetMoneyAccountSweepstakesPrizePool';
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
  DRAW_COMPLETE_BUTTON:
    'money-account-sweepstakes-draw-schedule-draw-complete-button',
} as const;

interface MoneyAccountSweepstakesDrawScheduleSectionProps {
  campaigns: CampaignDto[];
  localizedText: MoneyAccountSweepstakesLocalizedTextDto;
  entryCount?: number;
  isParticipating?: boolean;
  /** Open draw-proof sheet outside ScrollView (parent mounts the modal). */
  onOpenDrawProof?: (drawProof: MoneyAccountSweepstakesDrawProofDto) => void;
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
  onOpenDrawProof?: (drawProof: MoneyAccountSweepstakesDrawProofDto) => void;
}

const WeekRow: React.FC<WeekRowProps> = ({
  campaign,
  weekNumber,
  localizedText,
  entryCount,
  isParticipating = false,
  onOpenDrawProof,
}) => {
  const status = getCampaignStatus(campaign);
  const { drawProof } = useGetMoneyAccountSweepstakesDrawProof(
    campaign.id,
    status === 'complete',
  );
  const { prizePool } = useGetMoneyAccountSweepstakesPrizePool(campaign.id);

  const weekTitle = formatWeekTitle(localizedText.weekTitle, weekNumber);
  const dateRange = formatCampaignDateRange(
    campaign.startDate,
    campaign.endDate,
  );

  const openDrawProofSheet = useCallback(() => {
    if (!drawProof) {
      return;
    }
    onOpenDrawProof?.(drawProof);
  }, [drawProof, onOpenDrawProof]);

  const rowTestId = `${MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS.WEEK_ROW}-${campaign.id}`;
  const formattedPrizePoolAmount =
    prizePool?.unlockedPoolUsd != null
      ? formatUsd(prizePool.unlockedPoolUsd)
      : null;
  const prizePoolLabel = localizedText.prizePoolLabel;

  if (status === 'complete') {
    const hasProof = drawProof != null;

    return (
      <Box twClassName="gap-1 py-3" testID={rowTestId}>
        <Box twClassName="flex-row gap-4">
          <Box twClassName="flex-1 gap-1">
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {dateRange}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {weekTitle}
            </Text>
          </Box>
          <Box alignItems={BoxAlignItems.End} twClassName="flex-1 gap-1">
            {formattedPrizePoolAmount != null && (
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {formattedPrizePoolAmount}
              </Text>
            )}
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {hasProof
                ? localizedText.awardedLabel
                : localizedText.drawPendingTitle}
            </Text>
          </Box>
        </Box>
        {hasProof && (
          <Box alignItems={BoxAlignItems.Start} twClassName="pt-1">
            <Button
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Sm}
              onPress={openDrawProofSheet}
              testID={
                MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS.DRAW_COMPLETE_BUTTON
              }
            >
              {localizedText.drawScheduleViewResults}
            </Button>
          </Box>
        )}
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
                String(entryCount ?? 0),
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
  onOpenDrawProof,
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
            onOpenDrawProof={onOpenDrawProof}
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
