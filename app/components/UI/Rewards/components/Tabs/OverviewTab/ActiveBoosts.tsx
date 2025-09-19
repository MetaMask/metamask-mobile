import React, { useMemo } from 'react';
import { Dimensions, Image, TouchableOpacity } from 'react-native';
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
import { useTheme } from '../../../../../../util/theme';
import {
  selectActiveBoosts,
  selectActiveBoostsLoading,
  selectActiveBoostsError,
} from '../../../../../../reducers/rewards/selectors';
import { PointsBoostDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../../locales/i18n';
import { AppThemeKey } from '../../../../../../util/theme/models';
import {
  useSwapBridgeNavigation,
  SwapBridgeNavigationLocation,
} from '../../../../Bridge/hooks/useSwapBridgeNavigation';
import { getNativeAssetForChainId } from '@metamask/bridge-controller';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import { formatTimeRemaining } from '../../../utils/formatUtils';
import Logger from '../../../../../../util/Logger';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.7; // 70% of screen width
const CARD_SPACING = 16;

interface BoostCardProps {
  boost: PointsBoostDto;
  index: number;
}

const BoostCard: React.FC<BoostCardProps> = ({ boost }) => {
  const tw = useTailwind();
  const { themeAppearance } = useTheme();

  const token = getNativeAssetForChainId('eip155:59144');

  // Use the swap/bridge navigation hook
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.Rewards,
    sourcePage: 'rewards_overview',
    sourceToken: {
      address: token.address,
      symbol: token.symbol,
      decimals: token.decimals,
      chainId: 'eip155:59144',
    },
  });

  // Get appropriate icon URL based on theme
  const iconUrl = useMemo(
    () =>
      themeAppearance === AppThemeKey.light
        ? boost.icon?.lightModeUrl
        : boost.icon?.darkModeUrl,
    [boost.icon, themeAppearance],
  );

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
          tw.style('rounded-xl p-4 mr-4 h-32 relative'),
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
        {iconUrl && (
          <Box
            twClassName="absolute right-2 bottom-2"
            testID={REWARDS_VIEW_SELECTORS.ACTIVE_BOOST_CARD_ICON}
          >
            <Image
              source={{ uri: iconUrl }}
              resizeMode="contain"
              style={tw.style('h-16 w-16')}
            />
          </Box>
        )}
      </Box>
    </TouchableOpacity>
  );
};

const SectionHeader: React.FC<{ count: number | null }> = ({ count }) => (
  <Box twClassName="mb-4">
    <Box twClassName="flex-row items-center gap-2 mb-1">
      <Text variant={TextVariant.HeadingMd} twClassName="text-default">
        {strings('rewards.active_boosts.title')}
      </Text>
      {count !== null && (
        <Box twClassName="bg-text-muted rounded-full w-6 h-6 items-center justify-center">
          <Text variant={TextVariant.BodySm} twClassName="text-default">
            {count}
          </Text>
        </Box>
      )}
    </Box>
  </Box>
);

const ErrorBanner: React.FC = () => (
  <Box twClassName="bg-error-muted rounded-lg p-4 mb-4">
    <Box twClassName="flex-row items-center gap-2">
      <Icon
        name={IconName.Danger}
        size={IconSize.Sm}
        twClassName="text-error-default"
      />
      <Text variant={TextVariant.BodyMd} twClassName="text-error-default">
        {strings('rewards.active_boosts.error')}
      </Text>
    </Box>
  </Box>
);

const ActiveBoosts: React.FC = () => {
  const tw = useTailwind();
  const activeBoosts = useSelector(selectActiveBoosts) as
    | PointsBoostDto[]
    | null;
  const isLoading = useSelector(selectActiveBoostsLoading);
  const hasError = useSelector(selectActiveBoostsError);

  const numBoosts = useMemo(() => activeBoosts?.length || 0, [activeBoosts]);

  Logger.log('ActiveBoosts', {
    isLoading,
    numBoosts,
    hasError,
    activeBoosts: activeBoosts?.length,
  });

  // Local pan sink to capture horizontal swipes and prevent parent tab swipe
  const scrollNativeGesture = useMemo(() => Gesture.Native(), []);
  const panSink = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(1)
        .activeOffsetX([-2, 2])
        .failOffsetY([-8, 8])
        .simultaneousWithExternalGesture(scrollNativeGesture)
        .runOnJS(true),
    [scrollNativeGesture],
  );
  const combinedGesture = useMemo(
    () => Gesture.Simultaneous(scrollNativeGesture, panSink),
    [scrollNativeGesture, panSink],
  );

  if (!isLoading && !hasError && numBoosts === 0) {
    return null;
  }

  return (
    <Box twClassName="py-4">
      {/* Always show section header */}
      <SectionHeader count={isLoading ? 0 : numBoosts} />

      {/* Show error banner if there's an error */}
      {hasError && <ErrorBanner />}

      {/* Show loading state */}
      {isLoading || !activeBoosts ? (
        <Skeleton style={tw.style('h-32 bg-rounded')} width={CARD_WIDTH} />
      ) : hasError ? null /* Show active boosts */ : activeBoosts?.length ? ( // Show nothing if there's an error (just the banner)
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
