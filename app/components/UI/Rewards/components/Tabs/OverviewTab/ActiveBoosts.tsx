import React, { useMemo } from 'react';
import {
  Dimensions,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  ScrollView,
} from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  selectActiveBoosts,
  selectActiveBoostsLoading,
  selectActiveBoostsError,
  selectSeasonStartDate,
} from '../../../../../../reducers/rewards/selectors';
import { PointsBoostDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../../locales/i18n';
import {
  useSwapBridgeNavigation,
  SwapBridgeNavigationLocation,
} from '../../../../Bridge/hooks/useSwapBridgeNavigation';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import { formatTimeRemaining } from '../../../utils/formatUtils';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import RewardsThemeImageComponent from '../../ThemeImageComponent';
import RewardsErrorBanner from '../../RewardsErrorBanner';
import { MetaMetricsEvents, useMetrics } from '../../../../../hooks/useMetrics';
import { handleDeeplink } from '../../../../../../core/DeeplinkManager/handleDeeplink';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.7; // 70% of screen width
// SNAP_ADJUSTMENT accounts for the horizontal padding and margin applied to the BoostCard
// and its container.
// Calculation: BoostCard container has horizontal padding of 16px (px-4) on each side,
// and BoostCard itself has marginRight of 10px.
// Total adjustment = 16 (left padding) + 16 (right padding) + 10 (card margin) = 42
const SNAP_ADJUSTMENT = 16 + 16 + 10;

interface BoostCardProps {
  boost: PointsBoostDto;
  index: number;
  isLast: boolean;
}

const BoostCard: React.FC<BoostCardProps> = ({
  boost,
  index: _index,
  isLast: _isLast,
}) => {
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useMetrics();

  // Use the swap/bridge navigation hook
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.Rewards,
    sourcePage: 'rewards_overview',
  });

  const timeRemaining = useMemo(() => {
    if (!boost.endDate) {
      return null;
    }
    return formatTimeRemaining(new Date(boost.endDate));
  }, [boost.endDate]);

  const handleBoostTap = () => {
    //Use deeplink if provided, otherwise fallback to goToSwaps
    if (boost.deeplink) {
      handleDeeplink({ uri: boost.deeplink });
    } else {
      goToSwaps();
    }

    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_ACTIVE_BOOST_CLICKED)
        .addProperties({
          boost_id: boost.id,
          boost_name: boost.name,
        })
        .build(),
    );
  };

  const renderBoostBadge = () => {
    if (boost.seasonLong) {
      return (
        <Box twClassName="flex-row items-center gap-2">
          <Icon
            name={IconName.Clock}
            size={IconSize.Sm}
            twClassName="text-white"
          />
          <Text variant={TextVariant.BodySm} twClassName="text-white">
            {strings('rewards.season_1')}
          </Text>
        </Box>
      );
    }

    if (boost.endDate) {
      return (
        <Box twClassName="flex-row items-center gap-2">
          <Icon
            name={IconName.Clock}
            size={IconSize.Sm}
            twClassName="text-white"
          />
          <Text variant={TextVariant.BodySm} twClassName="text-white">
            {timeRemaining}
          </Text>
        </Box>
      );
    }

    return null;
  };

  return (
    <TouchableOpacity onPress={handleBoostTap} activeOpacity={0.8}>
      <Box
        style={[
          tw.style(
            `rounded-xl max-w-60 p-4 h-32 relative ${
              _index === 0 ? 'ml-4' : ''
            } ${!_isLast ? 'mr-4' : ''}`,
          ),
          {
            width: CARD_WIDTH,
            backgroundColor: boost.backgroundColor || tw.color('bg-default'),
          },
        ]}
        testID={REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD}
      >
        <Box twClassName="grid-item col-span-3 flex flex-col justify-between h-full">
          {/* Boost Name */}
          <Text
            variant={TextVariant.HeadingSm}
            twClassName="text-white mb-2"
            testID={REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD_NAME}
          >
            {boost.name}
          </Text>

          {/* Badge */}
          <Box
            twClassName="mt-auto"
            testID={REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD_TIME_REMAINING}
          >
            {renderBoostBadge()}
          </Box>
        </Box>
        {/* Boost Icon */}
        {boost.icon && (
          <Box
            twClassName="absolute right-2 bottom-2"
            testID={REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD_ICON}
          >
            <RewardsThemeImageComponent
              themeImage={boost.icon}
              style={tw.style('h-16 w-16')}
            />
          </Box>
        )}
      </Box>
    </TouchableOpacity>
  );
};

const SectionHeader: React.FC<{ count: number | null; isLoading: boolean }> = ({
  count,
  isLoading,
}) => (
  <Box twClassName="px-4">
    <Box twClassName="flex-row items-center gap-2">
      <Text variant={TextVariant.HeadingMd} twClassName="text-default">
        {strings('rewards.active_boosts_title')}
      </Text>
      {isLoading && <ActivityIndicator size="small" />}
      {count !== null && !isLoading && (
        <Box twClassName="bg-text-muted rounded-lg w-6 h-6 items-center justify-center">
          <Text variant={TextVariant.BodySm} twClassName="text-default">
            {count}
          </Text>
        </Box>
      )}
    </Box>
  </Box>
);

const ActiveBoosts: React.FC<{
  fetchActivePointsBoosts: () => Promise<void>;
}> = ({ fetchActivePointsBoosts }) => {
  const tw = useTailwind();
  const activeBoosts = useSelector(selectActiveBoosts) as
    | PointsBoostDto[]
    | null;
  const isLoading = useSelector(selectActiveBoostsLoading);
  const hasError = useSelector(selectActiveBoostsError);
  const seasonStartDate = useSelector(selectSeasonStartDate);

  const numBoosts = useMemo(() => activeBoosts?.length || 0, [activeBoosts]);

  // Platform-specific gesture handling to prevent parent tab swipe
  const scrollNativeGesture = useMemo(() => Gesture.Native(), []);
  const panSink = useMemo(() => {
    if (Platform.OS === 'android')
      return Gesture.Pan()
        .minDistance(1)
        .activeOffsetX([-2, 2])
        .failOffsetY([-8, 8])
        .simultaneousWithExternalGesture(scrollNativeGesture)
        .runOnJS(true);
  }, [scrollNativeGesture]);
  const combinedGesture = useMemo(
    () =>
      panSink
        ? Gesture.Simultaneous(scrollNativeGesture, panSink)
        : scrollNativeGesture,
    [scrollNativeGesture, panSink],
  );

  const renderBoostContent = () => {
    // Show loading state
    if (
      (isLoading || activeBoosts === null) &&
      !activeBoosts?.length &&
      !hasError
    ) {
      return (
        <Skeleton style={tw.style('h-32 mx-4 bg-rounded')} width={CARD_WIDTH} />
      );
    }

    // Show boost cards if we have data
    if (activeBoosts?.length) {
      return (
        <GestureDetector gesture={combinedGesture}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={CARD_WIDTH - SNAP_ADJUSTMENT}
            snapToAlignment="start"
            contentContainerStyle={tw.style('pr-4')}
          >
            {activeBoosts?.map((boost: PointsBoostDto, index: number) => (
              <BoostCard
                key={boost.id}
                boost={boost}
                index={index}
                isLast={index === activeBoosts.length - 1}
              />
            ))}
          </ScrollView>
        </GestureDetector>
      );
    }

    // Show nothing if there's an error (just the banner will be shown)
    return <></>;
  };

  if (!isLoading && !hasError && activeBoosts && numBoosts === 0) {
    return null;
  }

  return (
    <Box twClassName="pt-2 pb-4 gap-4">
      {/* Always show section header */}
      <SectionHeader
        count={activeBoosts?.length || null}
        isLoading={
          isLoading || (activeBoosts === null && !hasError && !!seasonStartDate)
        }
      />

      {/* Show error banner if there's an error */}
      {hasError && !activeBoosts?.length && !isLoading && (
        <RewardsErrorBanner
          title={strings('rewards.active_boosts_error.error_fetching_title')}
          description={strings(
            'rewards.active_boosts_error.error_fetching_description',
          )}
          onConfirm={fetchActivePointsBoosts}
          confirmButtonLabel={strings(
            'rewards.active_boosts_error.retry_button',
          )}
        />
      )}

      {/* Render boost content based on current state */}
      {renderBoostContent()}
    </Box>
  );
};

export default ActiveBoosts;
