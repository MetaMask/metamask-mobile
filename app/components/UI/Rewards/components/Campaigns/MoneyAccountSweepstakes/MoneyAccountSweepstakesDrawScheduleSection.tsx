import React, { useCallback } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type {
  CampaignDto,
  MoneyAccountSweepstakesDrawProofDto,
  MoneyAccountSweepstakesLocalizedTextDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { useGetMoneyAccountSweepstakesDrawProof } from '../../../hooks/useGetMoneyAccountSweepstakesDrawProof';
import { useGetMoneyAccountSweepstakesPrizePool } from '../../../hooks/useGetMoneyAccountSweepstakesPrizePool';
import { useMoneyAccountSweepstakesOutcome } from '../../../hooks/useMoneyAccountSweepstakesOutcome';
import {
  formatCampaignDateRange,
  getCampaignStatus,
} from '../CampaignTile.utils';
import MoneyAccountSweepstakesPrizePool from './MoneyAccountSweepstakesPrizePool';
import {
  ENTRIES_COUNT_PLACEHOLDER,
  WEEK_NUMBER_PLACEHOLDER,
} from './constants';

export const MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS = {
  CONTAINER: 'money-account-sweepstakes-draw-schedule-container',
  WEEK_ROW: 'money-account-sweepstakes-draw-schedule-week-row',
  DRAW_COMPLETE_BUTTON:
    'money-account-sweepstakes-draw-schedule-draw-complete-button',
  WINNER_BUTTON: 'money-account-sweepstakes-draw-schedule-winner-button',
} as const;

interface MoneyAccountSweepstakesDrawScheduleSectionProps {
  campaigns: CampaignDto[];
  localizedText: MoneyAccountSweepstakesLocalizedTextDto;
  activeCampaignId?: string | null;
  isParticipating?: boolean;
  entryCount?: number | null;
  /** Open draw-proof sheet outside ScrollView (parent mounts the modal). */
  onOpenDrawProof?: (drawProof: MoneyAccountSweepstakesDrawProofDto) => void;
  /** Open winner details sheet for a completed week the user won. */
  onOpenWinnerDetails?: (campaign: CampaignDto) => void;
}

const formatWeekTitle = (
  weekTitleTemplate: string,
  weekNumber: number,
): string =>
  weekTitleTemplate.replace(WEEK_NUMBER_PLACEHOLDER, String(weekNumber));

const ActiveWeekPrizePool: React.FC<{ campaignId: string }> = ({
  campaignId,
}) => {
  const { prizePool, isLoading, hasError, refetch } =
    useGetMoneyAccountSweepstakesPrizePool(campaignId);

  return (
    <MoneyAccountSweepstakesPrizePool
      prizePool={prizePool}
      isLoading={isLoading}
      hasError={hasError}
      refetch={refetch}
    />
  );
};

const UpcomingWeekPrizePool: React.FC<{ campaignId: string }> = ({
  campaignId,
}) => {
  const { prizePool, isLoading, hasError, refetch } =
    useGetMoneyAccountSweepstakesPrizePool(campaignId);

  return (
    <MoneyAccountSweepstakesPrizePool
      prizePool={prizePool}
      isLoading={isLoading}
      hasError={hasError}
      refetch={refetch}
    />
  );
};

interface WeekRowProps {
  campaign: CampaignDto;
  weekNumber: number;
  localizedText: MoneyAccountSweepstakesLocalizedTextDto;
  isParticipating?: boolean;
  entryCount?: number | null;
  onOpenDrawProof?: (drawProof: MoneyAccountSweepstakesDrawProofDto) => void;
  onOpenWinnerDetails?: (campaign: CampaignDto) => void;
}

const WeekRow: React.FC<WeekRowProps> = ({
  campaign,
  weekNumber,
  localizedText,
  isParticipating,
  entryCount,
  onOpenDrawProof,
  onOpenWinnerDetails,
}) => {
  const status = getCampaignStatus(campaign);
  const { drawProof } = useGetMoneyAccountSweepstakesDrawProof(
    campaign.id,
    status === 'complete',
  );
  const { outcome } = useMoneyAccountSweepstakesOutcome(
    status === 'complete' ? campaign.id : undefined,
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

  const openWinnerDetails = useCallback(() => {
    onOpenWinnerDetails?.(campaign);
  }, [campaign, onOpenWinnerDetails]);

  if (status === 'complete') {
    const hasProof = drawProof != null;
    const hasWon = outcome != null;
    const isWinFinalized = outcome?.outcomeStatus === 'finalized';

    return (
      <Box
        twClassName="gap-2"
        testID={`${MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS.WEEK_ROW}-${campaign.id}`}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="gap-2"
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            twClassName="flex-1"
          >
            {weekTitle} · {localizedText.completeLabel}
          </Text>
          {hasWon ? (
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Sm}
              onPress={openWinnerDetails}
              isDisabled={isWinFinalized}
              testID={`${MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS.WINNER_BUTTON}-${campaign.id}`}
            >
              {strings('rewards.campaign_winning.you_won')}
            </Button>
          ) : hasProof ? (
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Sm}
              onPress={openDrawProofSheet}
              testID={
                MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS.DRAW_COMPLETE_BUTTON
              }
            >
              {localizedText.drawCompleteTitle}
            </Button>
          ) : (
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
            >
              {localizedText.drawPendingTitle}
            </Text>
          )}
        </Box>
      </Box>
    );
  }

  if (status === 'active') {
    const entriesDisplay =
      isParticipating && entryCount !== undefined
        ? localizedText.entriesCountValue.replace(
            ENTRIES_COUNT_PLACEHOLDER,
            entryCount != null ? String(entryCount) : '-',
          )
        : null;

    return (
      <Box
        twClassName="gap-3"
        testID={`${MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS.WEEK_ROW}-${campaign.id}`}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="gap-2"
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.SuccessDefault}
            twClassName="flex-1"
          >
            {weekTitle} · {localizedText.drawScheduleCurrentDraw}
          </Text>
          {entriesDisplay && (
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.SuccessDefault}
            >
              {entriesDisplay}
            </Text>
          )}
          {!entriesDisplay && (
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.SuccessDefault}
            >
              {dateRange}
            </Text>
          )}
        </Box>
        <ActiveWeekPrizePool campaignId={campaign.id} />
      </Box>
    );
  }

  return (
    <Box
      twClassName="gap-1"
      testID={`${MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS.WEEK_ROW}-${campaign.id}`}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="gap-2"
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          twClassName="flex-1"
        >
          {weekTitle}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {dateRange}
        </Text>
      </Box>
      <UpcomingWeekPrizePool campaignId={campaign.id} />
    </Box>
  );
};

const MoneyAccountSweepstakesDrawScheduleSection: React.FC<
  MoneyAccountSweepstakesDrawScheduleSectionProps
> = ({
  campaigns,
  localizedText,
  isParticipating,
  entryCount,
  onOpenDrawProof,
  onOpenWinnerDetails,
}) => {
  if (campaigns.length === 0) {
    return null;
  }

  return (
    <Box
      twClassName="gap-4"
      testID={MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS.CONTAINER}
    >
      <Box twClassName="gap-1">
        <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
          {localizedText.drawScheduleTitle}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {localizedText.drawScheduleSummary}
        </Text>
      </Box>

      {campaigns.map((campaign, index) => (
        <React.Fragment key={campaign.id}>
          {index > 0 && <Box twClassName="border-b border-border-muted" />}
          <WeekRow
            campaign={campaign}
            weekNumber={index + 1}
            localizedText={localizedText}
            isParticipating={isParticipating}
            entryCount={entryCount}
            onOpenDrawProof={onOpenDrawProof}
            onOpenWinnerDetails={onOpenWinnerDetails}
          />
        </React.Fragment>
      ))}

      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {localizedText.drawScheduleEntriesReset}
      </Text>
    </Box>
  );
};

export default MoneyAccountSweepstakesDrawScheduleSection;
