import React, { type ReactNode } from 'react';
import { ImageBackground } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
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

interface MoneyAccountSweepstakesCampaignOverviewProps {
  campaign: CampaignDto;
  localizedText: MoneyAccountSweepstakesLocalizedTextDto;
  isParticipating?: boolean;
  stats?: MoneyAccountSweepstakesStatsMeDto | null;
  children?: ReactNode;
}

const MoneyAccountSweepstakesCampaignOverview: React.FC<
  MoneyAccountSweepstakesCampaignOverviewProps
> = ({ campaign, localizedText, isParticipating = false, stats, children }) => {
  const tw = useTailwind();
  const backgroundImageUrl = campaign.image?.lightModeUrl;

  if (isParticipating) {
    const balanceDisplay = stats
      ? formatUsd(Math.max(0, stats.currentBalanceUsd))
      : '—';
    const entriesDisplay = stats
      ? localizedText.entriesCountValue.replace(
          ENTRIES_COUNT_PLACEHOLDER,
          String(stats.entryCount),
        )
      : '—';
    const isQualified = stats?.todayStatus === 'on_track';
    const remainingBalance = stats
      ? Math.max(0, stats.qualifyingThresholdUsd - stats.currentBalanceUsd)
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
        default:
          return null;
      }
    })();
    const isPaused = stats?.todayStatus === 'lost_today';

    return (
      <Box twClassName="px-4 pb-5 pt-4" testID="campaign-status">
        <Box
          twClassName="gap-3 rounded-xl bg-muted p-4"
          testID="money-account-sweepstakes-balance-header"
        >
          <Box
            alignItems={BoxAlignItems.Center}
            flexDirection={BoxFlexDirection.Row}
            twClassName="gap-2"
          >
            <Text variant={TextVariant.HeadingSm}>
              {localizedText.balanceTitle}
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
              color={
                isQualified ? TextColor.SuccessDefault : TextColor.TextDefault
              }
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
          {children}
        </Box>
      </Box>
    );
  }

  return (
    <Box twClassName="px-4 pb-5 pt-4" testID="campaign-status">
      <Box twClassName="h-32 overflow-hidden rounded-xl border border-border-muted bg-black">
        <ImageBackground
          source={{ uri: backgroundImageUrl }}
          resizeMode="cover"
          style={tw.style('h-full w-full')}
          testID="money-account-sweepstakes-hero"
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
