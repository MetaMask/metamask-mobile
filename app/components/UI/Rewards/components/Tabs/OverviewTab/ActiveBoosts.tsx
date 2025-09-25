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
import BannerAlert from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../../../../component-library/components/Banners/Banner';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.7; // 70% of screen width
const CARD_SPACING = 16;

interface BoostCardProps {
  boost: PointsBoostDto;
  index: number;
}

const BoostCard: React.FC<BoostCardProps> = ({ boost }) => {
  const tw = useTailwind();

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

  // Go to swap view with Linea asset atm.
  // TODO: coordinate backend changes to support other default assets, or go to perps
  const handleBoostTap = () => {
    goToSwaps();
  };

  return (
    <TouchableOpacity onPress={handleBoostTap} activeOpacity={0.8}>
      <Box
        style={[
          tw.style('rounded-xl max-w-60 p-4 mr-2 h-32 relative'),
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
            {/* Season Long Badge */}
            {boost.seasonLong ? (
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
            ) : boost.endDate ? (
              <>
                {/* Time-limited Badge */}
                <Box twClassName="flex-row items-center gap-2">
                  <Icon name={IconName.Clock} size={IconSize.Sm} />
                  <Text variant={TextVariant.BodySm} twClassName="text-white">
                    {timeRemaining}
                  </Text>
                </Box>
              </>
            ) : null}
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
  <Box>
    <Box twClassName="flex-row items-center gap-2 items-center">
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

  if (!isLoading && !hasError && activeBoosts && numBoosts === 0) {
    return null;
  }

  return (
    <Box twClassName="py-4 gap-4">
      {/* Always show section header */}
      <SectionHeader
        count={activeBoosts?.length || null}
        isLoading={
          isLoading || (activeBoosts === null && !hasError && !!seasonStartDate)
        }
      />

      {/* Show error banner if there's an error */}
      {hasError && !activeBoosts?.length && !isLoading && (
        <BannerAlert
          severity={BannerAlertSeverity.Error}
          title={strings('rewards.active_boosts_error.error_fetching_title')}
          description={strings(
            'rewards.active_boosts_error.error_fetching_description',
          )}
          actionButtonProps={{
            size: ButtonSize.Md,
            style: tw.style('mt-2'),
            onPress: fetchActivePointsBoosts,
            label: strings('rewards.active_boosts_error.retry_button'),
            variant: ButtonVariants.Primary,
          }}
        />
      )}

      {/* Show loading state */}
      {(isLoading || activeBoosts === null) &&
      !activeBoosts?.length &&
      !hasError ? (
        <Skeleton style={tw.style('h-32 bg-rounded')} width={CARD_WIDTH} />
      ) : activeBoosts?.length ? ( // Show nothing if there's an error (just the banner)
        <GestureDetector gesture={combinedGesture}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            snapToAlignment="start"
          >
            {activeBoosts?.map((boost: PointsBoostDto, index: number) => (
              <BoostCard key={boost.id} boost={boost} index={index} />
            ))}
          </ScrollView>
        </GestureDetector>
      ) : (
        <></>
      )}
    </Box>
  );
};

export default ActiveBoosts;
