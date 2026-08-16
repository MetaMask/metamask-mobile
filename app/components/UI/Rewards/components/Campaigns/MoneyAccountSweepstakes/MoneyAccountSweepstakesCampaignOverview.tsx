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
  MoneyAccountSweepstakesStatsMeDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../../locales/i18n';
import moneyAccountSweepstakesHeaderArtwork from '../../../../../../images/rewards/money-account-sweepstakes-header.png';
import { formatUsd } from '../../../utils/formatUtils';

interface MoneyAccountSweepstakesCampaignOverviewProps {
  campaign: CampaignDto;
  isParticipating?: boolean;
  stats?: MoneyAccountSweepstakesStatsMeDto | null;
  children?: ReactNode;
}

const MoneyAccountSweepstakesCampaignOverview: React.FC<
  MoneyAccountSweepstakesCampaignOverviewProps
> = ({ isParticipating = false, stats, children }) => {
  const tw = useTailwind();

  if (isParticipating) {
    const balanceDisplay = stats
      ? formatUsd(Math.max(0, stats.currentBalanceUsd))
      : '—';
    const entriesDisplay = stats ? `${stats.entryCount}/7 entries` : '—';
    const isQualified = stats?.todayStatus === 'on_track';
    const remainingBalance = stats
      ? Math.max(0, stats.qualifyingThresholdUsd - stats.currentBalanceUsd)
      : 0;
    const qualificationMessage = (() => {
      switch (stats?.todayStatus) {
        case 'on_track':
          return "On track for today's entry";
        case 'not_yet_qualified':
          return remainingBalance > 0
            ? `Add ${formatUsd(remainingBalance)} to start earning entries`
            : 'Make a qualifying deposit to start earning entries';
        case 'lost_today':
          return remainingBalance > 0
            ? `Add ${formatUsd(remainingBalance)} to resume earning tomorrow`
            : 'Today’s entry is paused';
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
            <Text variant={TextVariant.HeadingSm}>Balance</Text>
            {isQualified && (
              <Box twClassName="rounded-md bg-success-muted px-2 py-1">
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.SuccessDefault}
                >
                  Qualified
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
              · this week
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
          source={moneyAccountSweepstakesHeaderArtwork}
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
          {strings('rewards.money_account_sweepstakes.prize_title')}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('rewards.money_account_sweepstakes.prize_description')}
        </Text>
      </Box>
    </Box>
  );
};

export default MoneyAccountSweepstakesCampaignOverview;
