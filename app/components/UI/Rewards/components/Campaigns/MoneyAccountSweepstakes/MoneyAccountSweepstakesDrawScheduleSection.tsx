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
import { WEEK_NUMBER_PLACEHOLDER } from './constants';
import { strings } from '../../../../../../../locales/i18n';

export const MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS = {
  CONTAINER: 'money-account-sweepstakes-draw-schedule-container',
  WEEK_ROW: 'money-account-sweepstakes-draw-schedule-week-row',
  DRAW_COMPLETE_BUTTON:
    'money-account-sweepstakes-draw-schedule-draw-complete-button',
} as const;

interface MoneyAccountSweepstakesDrawScheduleSectionProps {
  campaigns: CampaignDto[];
  localizedText: MoneyAccountSweepstakesLocalizedTextDto;
  activeCampaignId?: string | null;
  entryCount?: number;
  isParticipating?: boolean;
  /** Prototype-only: derive consecutive weeks when the backend returns fewer rows. */
  minimumWeekCount?: number;
  /** Prototype-only: show Week 1 complete and Week 2 active in the current window. */
  anchorToCurrentWeek?: boolean;
  /** Open draw-proof sheet outside ScrollView (parent mounts the modal). */
  onOpenDrawProof?: (drawProof: MoneyAccountSweepstakesDrawProofDto) => void;
}

const buildPrototypeWeeks = (
  campaigns: CampaignDto[],
  minimumWeekCount: number,
): CampaignDto[] => {
  if (campaigns.length === 0 || campaigns.length >= minimumWeekCount) {
    return campaigns;
  }

  const result = [...campaigns];
  const fallbackDurationMs = 7 * 24 * 60 * 60 * 1000;

  while (result.length < minimumWeekCount) {
    const previous = result[result.length - 1];
    const previousStart = new Date(previous.startDate).getTime();
    const previousEnd = new Date(previous.endDate).getTime();
    const durationMs = Math.max(
      previousEnd - previousStart,
      fallbackDurationMs,
    );
    const startDate = new Date(previousEnd);
    const endDate = new Date(previousEnd + durationMs);

    result.push({
      ...previous,
      id: `${previous.id}-prototype-week-${result.length + 1}`,
      name: `Week ${result.length + 1}`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  }

  return result;
};

const anchorWeeksToCurrentDate = (
  campaigns: CampaignDto[],
  activeCampaignId?: string | null,
  now: Date = new Date(),
): CampaignDto[] => {
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const firstStartMs = today.getTime() - weekMs;

  const activeCampaignIndex = activeCampaignId
    ? campaigns.findIndex((campaign) => campaign.id === activeCampaignId)
    : -1;

  return campaigns.map((campaign, index) => {
    let id = campaign.id;
    if (activeCampaignIndex >= 0 && activeCampaignIndex !== 1) {
      if (index === activeCampaignIndex) {
        id = `${campaign.id}-prototype-complete-week-1`;
      } else if (index === 1 && activeCampaignId) {
        id = activeCampaignId;
      }
    }

    return {
      ...campaign,
      id,
      startDate: new Date(firstStartMs + index * weekMs).toISOString(),
      endDate: new Date(firstStartMs + (index + 1) * weekMs).toISOString(),
    };
  });
};

const formatWeekTitle = (
  weekTitleTemplate: string,
  weekNumber: number,
): string =>
  weekTitleTemplate.replace(WEEK_NUMBER_PLACEHOLDER, String(weekNumber));

interface WeekRowProps {
  campaign: CampaignDto;
  weekNumber: number;
  localizedText: MoneyAccountSweepstakesLocalizedTextDto;
  forceCompleteLabel?: boolean;
  entryCount?: number;
  isParticipating?: boolean;
  onOpenDrawProof?: (drawProof: MoneyAccountSweepstakesDrawProofDto) => void;
}

const WeekRow: React.FC<WeekRowProps> = ({
  campaign,
  weekNumber,
  localizedText,
  forceCompleteLabel = false,
  entryCount,
  isParticipating = false,
  onOpenDrawProof,
}) => {
  const status = getCampaignStatus(campaign);
  const { drawProof } = useGetMoneyAccountSweepstakesDrawProof(
    campaign.id,
    status === 'complete',
  );
  const { prizePool } = useGetMoneyAccountSweepstakesPrizePool(
    status === 'active' ? campaign.id : undefined,
  );

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
  const prizePoolAmount = prizePool?.unlockedPoolUsd ?? 2500;
  const formattedPrizePoolAmount = Math.round(prizePoolAmount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const prizePoolLabel = `$${formattedPrizePoolAmount} prize pool`;

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
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {forceCompleteLabel ? '$5,000' : `$${formattedPrizePoolAmount}`}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {hasProof || forceCompleteLabel
                ? 'Awarded'
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
              {strings(
                'rewards.money_account_sweepstakes.draw_schedule.view_results',
              )}
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
            {weekTitle} ·{' '}
            {strings(
              'rewards.money_account_sweepstakes.draw_schedule.current_draw',
            )}
          </Text>
        </Box>
        <Box alignItems={BoxAlignItems.End} twClassName="flex-1 gap-1">
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            ${formattedPrizePoolAmount}
          </Text>
          {isParticipating ? (
            <Text variant={TextVariant.BodySm} color={TextColor.SuccessDefault}>
              {`${entryCount ?? 0}/7 entries`}
            </Text>
          ) : (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              Prize pool
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
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          $2,500
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          Prize pool
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
  activeCampaignId,
  entryCount,
  isParticipating,
  minimumWeekCount = campaigns.length,
  anchorToCurrentWeek = false,
  onOpenDrawProof,
}) => {
  if (campaigns.length === 0) {
    return null;
  }

  const prototypeCampaigns = buildPrototypeWeeks(campaigns, minimumWeekCount);
  const displayCampaigns = anchorToCurrentWeek
    ? anchorWeeksToCurrentDate(prototypeCampaigns, activeCampaignId)
    : prototypeCampaigns;

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
          {strings('rewards.money_account_sweepstakes.draw_schedule.summary')}
        </Text>
      </Box>

      {displayCampaigns.map((campaign, index) => (
        <React.Fragment key={campaign.id}>
          <WeekRow
            campaign={campaign}
            weekNumber={index + 1}
            localizedText={localizedText}
            forceCompleteLabel={anchorToCurrentWeek && index === 0}
            entryCount={entryCount}
            isParticipating={isParticipating}
            onOpenDrawProof={onOpenDrawProof}
          />
        </React.Fragment>
      ))}

      <Box twClassName="border-t border-border-muted pt-3">
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {strings(
            'rewards.money_account_sweepstakes.draw_schedule.entries_reset',
          )}
        </Text>
      </Box>
    </Box>
  );
};

export default MoneyAccountSweepstakesDrawScheduleSection;
