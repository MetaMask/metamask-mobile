import React from 'react';
import {
  Box,
  BoxFlexDirection,
  TextVariant,
  Text,
} from '@metamask/design-system-react-native';
import ProgressBar from 'react-native-progress/Bar';
import { useRewardsStore } from '../../hooks';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getTimeDifferenceFromNow } from '../../../../../util/date';
import { useTheme } from '../../../../../util/theme';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import MetamaskRewardsPointsImage from '../../../../../images/metamask-rewards-points.svg';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import SeasonTierImage from '../SeasonTierImage';
import { capitalize } from 'lodash';

const formatTimeRemaining = (endDate: Date): string | null => {
  const { days, hours, minutes } = getTimeDifferenceFromNow(endDate.getTime());
  return hours <= 0
    ? minutes <= 0
      ? null
      : `${minutes}m`
    : `${days}d ${hours}h`;
};

const formatNumber = (value: number | null): string => {
  if (value === null || value === undefined) {
    return '0';
  }
  try {
    return getIntlNumberFormatter(I18n.locale).format(value);
  } catch (e) {
    return String(value);
  }
};

const SeasonStatus: React.FC = () => {
  const { currentTierId, season, balance, seasonStatusLoading } =
    useRewardsStore();
  const theme = useTheme();
  // Memoized currentTier to avoid unnecessary recalculations
  const {
    tier: currentTier,
    order: currentTierOrder,
    nextTier,
  } = React.useMemo(() => {
    if (!season?.tiers?.length || !currentTierId)
      return { currentTier: undefined, order: 0, nextTier: undefined };
    // Sort tiers by pointsNeeded ascending
    const sortedTiers = [...season.tiers].sort(
      (a, b) => a.pointsNeeded - b.pointsNeeded,
    );
    const order =
      sortedTiers.findIndex((tier) => tier.id === currentTierId) + 1;
    return {
      tier: sortedTiers[order] || undefined,
      order,
      nextTier: sortedTiers[order + 1] || undefined,
    };
  }, [season?.tiers, currentTierId]);

  const progress = React.useMemo(() => {
    if (!currentTier || !balance.total) {
      return 0;
    }
    if (!nextTier?.pointsNeeded) {
      return 1;
    }
    return balance.total >= nextTier.pointsNeeded ? 1 : 100;
  }, [currentTier, nextTier, balance.total]);

  const pointsToLevelUp = React.useMemo(() => {
    if (!nextTier?.pointsNeeded) {
      return 0;
    }
    if (!balance.total) {
      return nextTier?.pointsNeeded;
    }
    return nextTier.pointsNeeded >= balance.total
      ? nextTier.pointsNeeded - balance.total
      : 0;
  }, [nextTier, balance.total]);

  const timeRemaining = React.useMemo(() => {
    if (!season?.endDate) {
      return null;
    }
    return formatTimeRemaining(new Date(season.endDate));
  }, [season?.endDate]);

  const tierName = React.useMemo(() => {
    if (!currentTier?.type) {
      return '';
    }
    return capitalize(currentTier.type);
  }, [currentTier?.type]);

  if (seasonStatusLoading || !season.startDate) {
    return <Skeleton height={115} width="100%" />;
  }

  return (
    <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-4 w-full">
      {/* Top Row - season name, tier name, and tier image */}
      <Box twClassName="flex-row justify-between items-center">
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-4">
          {/* Tier image */}
          <Box twClassName="h-[42px] w-[55px] flex align-center">
            <SeasonTierImage
              tierOrder={currentTierOrder}
              twClassName="w-full h-full"
            />
          </Box>

          {/* Tier name */}
          <Box flexDirection={BoxFlexDirection.Column}>
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              {strings('rewards.level')} {currentTierOrder}
            </Text>
            <Text variant={TextVariant.BodyMd} twClassName="text-default">
              {tierName}
            </Text>
          </Box>
        </Box>

        {/* Season ends */}
        {!!season?.endDate && !!timeRemaining && (
          <Box flexDirection={BoxFlexDirection.Column}>
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              {strings('rewards.season_ends')}
            </Text>
            <Text variant={TextVariant.BodyMd} twClassName="text-default">
              {timeRemaining}
            </Text>
          </Box>
        )}
      </Box>

      {/* Middle Row - Progress bar */}
      <Box twClassName="w-full h-[16px] flex-row relative">
        {/* First progress bar - filled portion */}
        {!!progress && (
          <Box
            twClassName="h-full absolute left-0 top-0 z-10"
            style={{ width: `${progress * 100}%` }}
          >
            <ProgressBar
              progress={1}
              width={null as unknown as number}
              color={theme.colors.accent01.normal}
              height={16}
              borderColor={theme.colors.accent01.normal}
              borderRadius={10}
              unfilledColor="transparent"
            />
          </Box>
        )}

        {/* Second progress bar - unfilled portion */}
        {progress < 1 && (
          <Box twClassName="flex-1 h-full absolute left-0 top-0 w-full z-0">
            <ProgressBar
              progress={0}
              width={null as unknown as number}
              color="transparent"
              height={16}
              borderColor={theme.colors.background.section}
              borderRadius={10}
              unfilledColor={theme.colors.background.section}
            />
          </Box>
        )}
      </Box>

      {/* Bottom Row - Points Summary */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="gap-2 justify-between"
      >
        <Box twClassName="flex-row items-center gap-2">
          <MetamaskRewardsPointsImage name="MetamaskRewardsPoints" />

          <Text variant={TextVariant.HeadingLg} twClassName="text-default">
            {formatNumber(balance.total)}{' '}
            {!balance.total || balance.total > 1
              ? strings('rewards.points').toLowerCase()
              : strings('rewards.point').toLowerCase()}
          </Text>
        </Box>

        {pointsToLevelUp > 0 && (
          <Text variant={TextVariant.BodySm} twClassName="text-alternative">
            {formatNumber(pointsToLevelUp)}{' '}
            {strings('rewards.to_level_up').toLowerCase()}
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default SeasonStatus;
