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
import MoneyAccountSweepstakesPrizePool from './MoneyAccountSweepstakesPrizePool';
import { WEEK_NUMBER_PLACEHOLDER } from './constants';

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
  /** Open draw-proof sheet outside ScrollView (parent mounts the modal). */
  onOpenDrawProof?: (drawProof: MoneyAccountSweepstakesDrawProofDto) => void;
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

interface WeekRowProps {
  campaign: CampaignDto;
  weekNumber: number;
  localizedText: MoneyAccountSweepstakesLocalizedTextDto;
  onOpenDrawProof?: (drawProof: MoneyAccountSweepstakesDrawProofDto) => void;
}

const WeekRow: React.FC<WeekRowProps> = ({
  campaign,
  weekNumber,
  localizedText,
  onOpenDrawProof,
}) => {
  const status = getCampaignStatus(campaign);
  const { drawProof } = useGetMoneyAccountSweepstakesDrawProof(
    campaign.id,
    status === 'complete',
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

  if (status === 'complete') {
    const hasProof = drawProof != null;

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
          {hasProof ? (
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
            {weekTitle} · {localizedText.activeLabel}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.SuccessDefault}
          >
            {dateRange}
          </Text>
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
    </Box>
  );
};

const MoneyAccountSweepstakesDrawScheduleSection: React.FC<
  MoneyAccountSweepstakesDrawScheduleSectionProps
> = ({ campaigns, localizedText, onOpenDrawProof }) => {
  if (campaigns.length === 0) {
    return null;
  }

  return (
    <Box
      twClassName="gap-4"
      testID={MONEY_ACCOUNT_SWEEPSTAKES_DRAW_SCHEDULE_TEST_IDS.CONTAINER}
    >
      <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
        {localizedText.drawScheduleTitle}
      </Text>

      {campaigns.map((campaign, index) => (
        <React.Fragment key={campaign.id}>
          {index > 0 && <Box twClassName="border-b border-border-muted" />}
          <WeekRow
            campaign={campaign}
            weekNumber={index + 1}
            localizedText={localizedText}
            onOpenDrawProof={onOpenDrawProof}
          />
        </React.Fragment>
      ))}
    </Box>
  );
};

export default MoneyAccountSweepstakesDrawScheduleSection;
