import React from 'react';
import {
  Box,
  BoxFlexDirection,
  TextVariant,
  Text,
} from '@metamask/design-system-react-native';
import ProgressBar from 'react-native-progress/Bar';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import MetamaskRewardsPointsImage from '../../../../../images/metamask-rewards-points.svg';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import SeasonTierImage from '../SeasonTierImage';
import { capitalize } from 'lodash';
import { useSelector } from 'react-redux';
import {
  selectSeasonStatusLoading,
  selectSeasonTiers,
  selectBalanceTotal,
  selectSeasonEndDate,
  selectNextTierPointsNeeded,
  selectCurrentTier,
  selectNextTier,
} from '../../../../../reducers/rewards/selectors';
import { formatNumber, formatTimeRemaining } from '../../utils/formatUtils';

const SeasonStatus: React.FC = () => {
  const currentTier = useSelector(selectCurrentTier);
  const nextTier = useSelector(selectNextTier);
  const nextTierPointsNeeded = useSelector(selectNextTierPointsNeeded);
  const tiers = useSelector(selectSeasonTiers);
  const balanceTotal = useSelector(selectBalanceTotal);
  const seasonStatusLoading = useSelector(selectSeasonStatusLoading);
  const seasonEndDate = useSelector(selectSeasonEndDate);
  const theme = useTheme();

  const progress = React.useMemo(() => {
    if (!currentTier || !balanceTotal) {
      return 0;
    }
    if (!nextTier?.pointsNeeded || balanceTotal >= nextTier.pointsNeeded) {
      return 1;
    }

    const currentTierBaseline = currentTier.pointsNeeded;
    const nextTierRequirement = nextTier.pointsNeeded;
    const tierRange = nextTierRequirement - currentTierBaseline;
    const progressInTier = balanceTotal - currentTierBaseline;

    return Math.max(0, progressInTier / tierRange);
  }, [currentTier, nextTier, balanceTotal]);

  const timeRemaining = React.useMemo(() => {
    if (!seasonEndDate) {
      return null;
    }
    return formatTimeRemaining(new Date(seasonEndDate));
  }, [seasonEndDate]);

  const tierName = React.useMemo(() => {
    if (!currentTier?.name) {
      return '';
    }
    return capitalize(currentTier.name);
  }, [currentTier?.name]);

  const currentTierOrder = React.useMemo(() => {
    if (!tiers?.length || !currentTier) {
      return 0;
    }
    return tiers.findIndex((tier) => tier.id === currentTier.id) + 1;
  }, [tiers, currentTier]);

  if (seasonStatusLoading) {
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
        {!!seasonEndDate && !!timeRemaining && (
          <Box flexDirection={BoxFlexDirection.Column}>
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              {strings('rewards.season_ends')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-default text-right"
            >
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
        twClassName="gap-2 justify-between items-center -mt-2"
      >
        <Box twClassName="flex-row items-center gap-2">
          <MetamaskRewardsPointsImage name="MetamaskRewardsPoints" />

          <Box twClassName="flex-row items-center gap-1">
            <Text variant={TextVariant.HeadingLg} twClassName="text-default">
              {formatNumber(balanceTotal)}
            </Text>

            <Text
              variant={TextVariant.HeadingSm}
              twClassName="text-default text-left -mb-1"
            >
              {!balanceTotal || balanceTotal > 1
                ? strings('rewards.points').toLowerCase()
                : strings('rewards.point').toLowerCase()}
            </Text>
          </Box>
        </Box>

        {!!nextTierPointsNeeded && (
          <Text variant={TextVariant.BodySm} twClassName="text-alternative">
            {formatNumber(nextTierPointsNeeded)}{' '}
            {strings('rewards.to_level_up').toLowerCase()}
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default SeasonStatus;
