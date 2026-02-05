import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { StatusBar, BackHandler, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import PagerView, {
  PagerViewOnPageSelectedEvent,
} from 'react-native-pager-view';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  Box,
  Icon,
  IconName,
  IconSize,
  IconColor,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { PredictStoryViewProps } from './PredictStoryView.types';
import PredictStoryCard from './PredictStoryCard';
import PredictStoryIndicator from './PredictStoryIndicator';
import { usePredictMarketData } from '../../hooks/usePredictMarketData';
import { PredictMarket } from '../../types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

/**
 * PredictStoryView - A full-screen vertical swipe navigation for browsing prediction markets.
 *
 * Similar to Instagram Stories, users can swipe up/down to navigate between markets.
 * Each page shows a full-screen market card with outcomes information.
 *
 * @example
 * ```tsx
 * <PredictStoryView
 *   initialIndex={0}
 *   category="trending"
 *   onClose={() => navigation.goBack()}
 * />
 * ```
 */
const PredictStoryView = ({
  initialIndex = 0,
  category = 'trending',
  onClose,
}: PredictStoryViewProps) => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Fetch prediction markets
  const {
    marketData,
    isFetching,
    error,
    hasMore,
    fetchMore,
  } = usePredictMarketData({
    category,
    pageSize: 20,
  });

  // Current page tracking
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const pagerRef = useRef<PagerView>(null);

  // Handle page change
  const handlePageSelected = useCallback(
    (event: PagerViewOnPageSelectedEvent) => {
      const newIndex = event.nativeEvent.position;
      setCurrentIndex(newIndex);

      // Load more when approaching the end
      if (hasMore && newIndex >= marketData.length - 5) {
        fetchMore();
      }
    },
    [hasMore, marketData.length, fetchMore],
  );

  // Handle close
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      navigation.goBack();
    }
  }, [onClose, navigation]);

  // Handle back button on Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleClose();
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () =>
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [handleClose]),
  );

  // Navigate to full market details
  const handleViewDetails = useCallback(
    (market: PredictMarket) => {
      navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: market.id,
          providerId: market.providerId,
        },
      });
    },
    [navigation],
  );

  // Memoize the page views to prevent unnecessary re-renders
  const pages = useMemo(
    () =>
      marketData.map((market, index) => (
        <PredictStoryPageWrapper
          key={market.id}
          market={market}
          index={index}
          totalCount={marketData.length}
          isActive={index === currentIndex}
          onViewDetails={handleViewDetails}
        />
      )),
    [marketData, currentIndex, handleViewDetails],
  );

  // Loading state
  if (isFetching && marketData.length === 0) {
    return (
      <Box twClassName="flex-1 bg-default items-center justify-center">
        <ActivityIndicator size="large" />
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          twClassName="mt-4"
        >
          {strings('predict.story.loading')}
        </Text>
      </Box>
    );
  }

  // Error state
  if (error && marketData.length === 0) {
    return (
      <Box twClassName="flex-1 bg-default items-center justify-center px-8">
        <Icon
          name={IconName.Warning}
          size={IconSize.Xl}
          color={IconColor.Error}
        />
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          twClassName="mt-4 text-center"
        >
          {error}
        </Text>
      </Box>
    );
  }

  // Empty state
  if (marketData.length === 0) {
    return (
      <Box twClassName="flex-1 bg-default items-center justify-center">
        <Icon
          name={IconName.Chart}
          size={IconSize.Xl}
          color={IconColor.Muted}
        />
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          twClassName="mt-4"
        >
          {strings('predict.story.no_markets')}
        </Text>
      </Box>
    );
  }

  return (
    <Box twClassName="flex-1 bg-default">
      <StatusBar barStyle="light-content" />

      {/* Close button */}
      <Animated.View
        entering={FadeIn.delay(300).duration(200)}
        style={[
          tw.style('absolute z-20'),
          { top: insets.top + 10, left: 16 },
        ]}
      >
        <Pressable
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) =>
            tw.style(
              'w-10 h-10 rounded-full bg-muted items-center justify-center',
              pressed && 'opacity-70',
            )
          }
        >
          <Icon
            name={IconName.Close}
            size={IconSize.Md}
            color={IconColor.Default}
          />
        </Pressable>
      </Animated.View>

      {/* Category badge */}
      <Animated.View
        entering={FadeIn.delay(300).duration(200)}
        style={[
          tw.style('absolute z-20'),
          { top: insets.top + 16, right: 60 },
        ]}
      >
        <Box twClassName="px-3 py-1 rounded-full bg-primary-muted">
          <Text variant={TextVariant.BodySMMedium} color={TextColor.Primary}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </Text>
        </Box>
      </Animated.View>

      {/* Page indicator */}
      <PredictStoryIndicator
        currentIndex={currentIndex}
        totalCount={marketData.length}
      />

      {/* Vertical Pager */}
      <AnimatedPagerView
        ref={pagerRef}
        style={tw.style('flex-1')}
        initialPage={initialIndex}
        orientation="vertical"
        onPageSelected={handlePageSelected}
        overdrag
        offscreenPageLimit={1}
      >
        {pages}
      </AnimatedPagerView>
    </Box>
  );
};

/**
 * Wrapper component for each market page
 */
interface PredictStoryPageWrapperProps {
  market: PredictMarket;
  index: number;
  totalCount: number;
  isActive: boolean;
  onViewDetails: (market: PredictMarket) => void;
}

const PredictStoryPageWrapper = React.memo(
  ({
    market,
    index,
    totalCount,
    isActive,
    onViewDetails,
  }: PredictStoryPageWrapperProps) => {
    const handleViewDetails = useCallback(() => {
      onViewDetails(market);
    }, [market, onViewDetails]);

    return (
      <PredictStoryCard
        market={market}
        isActive={isActive}
        onViewDetails={handleViewDetails}
        index={index}
        totalCount={totalCount}
      />
    );
  },
);

PredictStoryPageWrapper.displayName = 'PredictStoryPageWrapper';

export default PredictStoryView;
