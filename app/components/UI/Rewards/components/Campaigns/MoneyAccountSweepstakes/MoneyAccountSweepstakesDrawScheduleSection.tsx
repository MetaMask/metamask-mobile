import React, { useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import {
  BottomSheet,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  FontWeight,
  IconColor,
  IconName,
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
} as const;

interface MoneyAccountSweepstakesDrawScheduleSectionProps {
  campaigns: CampaignDto[];
  localizedText: MoneyAccountSweepstakesLocalizedTextDto;
  activeCampaignId?: string | null;
}

const formatWeekTitle = (
  weekTitleTemplate: string,
  weekNumber: number,
): string =>
  weekTitleTemplate.replace(WEEK_NUMBER_PLACEHOLDER, String(weekNumber));

const DrawProofSheet: React.FC<{
  drawProof: MoneyAccountSweepstakesDrawProofDto;
  localizedText: MoneyAccountSweepstakesLocalizedTextDto;
  onClose: () => void;
}> = ({ drawProof, localizedText, onClose }) => {
  const { explanation, originalDraw } = drawProof;

  return (
    <BottomSheet onClose={onClose}>
      <Box twClassName="px-4 pb-4 max-h-[80%]">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.End}
          twClassName="mb-4"
        >
          <ButtonIcon
            iconName={IconName.Close}
            iconProps={{ color: IconColor.IconDefault }}
            onPress={onClose}
          />
        </Box>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Box twClassName="gap-3 mb-4">
            <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
              {localizedText.drawProofTitle}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {localizedText.merkleRootLabel}: {explanation.merkleRoot}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {localizedText.formulaLabel}: {explanation.formula}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {localizedText.drawProofEntriesLabel}: {explanation.entryCount}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {localizedText.winnersLabel}: {explanation.winnerCount}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {localizedText.reservesLabel}: {explanation.reserveCount}
            </Text>
          </Box>

          <Box twClassName="gap-2">
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {localizedText.originalDrawTitle}
            </Text>
            {originalDraw.map((entry) => (
              <Box
                key={`${entry.drawOrder}-${entry.addressPrefix}`}
                twClassName="gap-0.5 py-2 border-b border-border-muted"
              >
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                >
                  #{entry.drawOrder} · {entry.addressPrefix}
                  {entry.isReserve ? ` ${localizedText.reserveSuffix}` : ''}
                </Text>
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.TextAlternative}
                >
                  {entry.refCode
                    ? `${localizedText.refLabel}: ${entry.refCode} · `
                    : ''}
                  {localizedText.weightLabel}: {entry.weight}
                </Text>
              </Box>
            ))}
          </Box>
        </ScrollView>
      </Box>
    </BottomSheet>
  );
};

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
}

const WeekRow: React.FC<WeekRowProps> = ({
  campaign,
  weekNumber,
  localizedText,
}) => {
  const status = getCampaignStatus(campaign);
  const { drawProof } = useGetMoneyAccountSweepstakesDrawProof(
    campaign.id,
    status === 'complete',
  );

  const [isProofSheetOpen, setIsProofSheetOpen] = useState(false);

  const weekTitle = formatWeekTitle(localizedText.weekTitle, weekNumber);
  const dateRange = formatCampaignDateRange(
    campaign.startDate,
    campaign.endDate,
  );

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
            <Pressable onPress={() => setIsProofSheetOpen(true)}>
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {localizedText.drawCompleteTitle}
              </Text>
            </Pressable>
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

        {isProofSheetOpen && drawProof && (
          <DrawProofSheet
            drawProof={drawProof}
            localizedText={localizedText}
            onClose={() => setIsProofSheetOpen(false)}
          />
        )}
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
> = ({ campaigns, localizedText }) => {
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
          />
        </React.Fragment>
      ))}
    </Box>
  );
};

export default MoneyAccountSweepstakesDrawScheduleSection;
