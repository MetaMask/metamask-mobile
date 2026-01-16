import React, { useState } from 'react';
import {
  Box,
  BoxFlexDirection,
  TextVariant,
  Text,
  FontWeight,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import ProgressBar from 'react-native-progress/Bar';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import MetamaskRewardsPointsImage from '../../../../../images/rewards/metamask-rewards-points.svg';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { capitalize } from 'lodash';
import { useSelector } from 'react-redux';
import RewardsErrorBanner from '../RewardsErrorBanner';
import {
  selectSeasonStatusLoading,
  selectSeasonTiers,
  selectBalanceTotal,
  selectSeasonEndDate,
  selectNextTierPointsNeeded,
  selectCurrentTier,
  selectNextTier,
  selectSeasonStatusError,
  selectSeasonStartDate,
} from '../../../../../reducers/rewards/selectors';
import { formatNumber, formatTimeRemaining } from '../../utils/formatUtils';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import RewardsThemeImageComponent from '../ThemeImageComponent';
import { Image } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import fallbackTierImage from '../../../../../images/rewards/tiers/rewards-s1-tier-1.png';
import { useSeasonStatus } from '../../hooks/useSeasonStatus';
import RewardsImageModal from '../RewardsImageModal';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

const SeasonStatus: React.FC = () => {
  const tw = useTailwind();
  const currentTier = useSelector(selectCurrentTier);
  const nextTier = useSelector(selectNextTier);
  const nextTierPointsNeeded = useSelector(selectNextTierPointsNeeded);
  const tiers = useSelector(selectSeasonTiers);
  const balanceTotal = useSelector(selectBalanceTotal);
  const seasonStatusLoading = useSelector(selectSeasonStatusLoading);
  const seasonStatusError = useSelector(selectSeasonStatusError);
  const seasonStartDate = useSelector(selectSeasonStartDate);
  const seasonEndDate = useSelector(selectSeasonEndDate);
  const theme = useTheme();

  const { fetchSeasonStatus } = useSeasonStatus({ onlyForExplicitFetch: true });

  const [isImageExpanded, setIsImageExpanded] = useState(false);

  const handleImagePress = () => {
    setIsImageExpanded(true);
  };

  const handleCloseModal = () => {
    setIsImageExpanded(false);
  };

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

  if ((seasonStatusLoading || !currentTier) && !seasonStatusError) {
    return (
      <Box twClassName="px-4">
        <Skeleton height={115} width="100%" />
      </Box>
    );
  }

  if (seasonStatusError && !seasonStartDate) {
    return (
      <Box twClassName="px-4">
        <RewardsErrorBanner
          title={strings('rewards.season_status_error.error_fetching_title')}
          description={strings(
            'rewards.season_status_error.error_fetching_description',
          )}
          onConfirm={() => {
            fetchSeasonStatus();
          }}
          confirmButtonLabel={strings(
            'rewards.season_status_error.retry_button',
          )}
        />
      </Box>
    );
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      twClassName="gap-4 w-full px-4"
    >
      {/* Top Row - season name, tier name, and tier image */}
      <Box twClassName="flex-row justify-between items-center -mb-2">
        <Box
          flexDirection={BoxFlexDirection.Row}
          twClassName="gap-4 items-center"
        >
          {/* Tier image - tappable to expand */}
          <TouchableOpacity onPress={handleImagePress} activeOpacity={0.7}>
            {currentTier?.image ? (
              <RewardsThemeImageComponent
                themeImage={currentTier.image}
                style={tw.style('h-15 w-15')}
              />
            ) : (
              <Image source={fallbackTierImage} style={tw.style('h-15 w-15')} />
            )}
          </TouchableOpacity>

          {/* Tier name */}
          <Box flexDirection={BoxFlexDirection.Column}>
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-alternative"
              testID={REWARDS_VIEW_SELECTORS.SEASON_STATUS_LEVEL}
            >
              {strings('rewards.level')} {currentTierOrder}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-default"
              testID={REWARDS_VIEW_SELECTORS.SEASON_STATUS_TIER_NAME}
            >
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
              borderWidth={0}
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
              borderWidth={0}
              unfilledColor={theme.colors.background.section}
            />
          </Box>
        )}
      </Box>

      {/* Bottom Row - Points Summary */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="gap-2 justify-between items-center"
      >
        <Box
          alignItems={BoxAlignItems.Start}
          flexDirection={BoxFlexDirection.Row}
          twClassName="gap-2"
        >
          <MetamaskRewardsPointsImage
            name="MetamaskRewardsPoints"
            style={tw.style('mt-0.5')}
          />

          <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-1">
            <Text
              style={tw.style({
                fontSize: 22,
                fontWeight: FontWeight.Bold,
                marginTop: 2,
              })}
              testID={REWARDS_VIEW_SELECTORS.SEASON_STATUS_POINTS}
            >
              {formatNumber(balanceTotal)}
            </Text>

            <Text variant={TextVariant.HeadingMd}>
              {!balanceTotal || balanceTotal > 1
                ? strings('rewards.points').toLowerCase()
                : strings('rewards.point').toLowerCase()}
            </Text>
          </Box>
        </Box>

        {!!nextTierPointsNeeded && (
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-alternative w-[50%] text-right"
          >
            {formatNumber(nextTierPointsNeeded)}{' '}
            {strings('rewards.to_level_up').toLowerCase()}
          </Text>
        )}
      </Box>

      {/* Full-screen image modal */}
      <RewardsImageModal
        visible={isImageExpanded}
        onClose={handleCloseModal}
        themeImage={currentTier?.image}
        fallbackImage={fallbackTierImage}
      />
    </Box>
  );
};

export default SeasonStatus;
