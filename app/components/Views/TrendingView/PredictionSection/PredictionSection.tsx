import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { useSelector } from 'react-redux';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { usePredictMarketData } from '../../../UI/Predict/hooks/usePredictMarketData';
import PredictMarket from '../../../UI/Predict/components/PredictMarket';
import { PredictMarket as PredictMarketType } from '../../../UI/Predict/types';
import { PredictEventValues } from '../../../UI/Predict/constants/eventNames';
import PredictMarketSkeleton from '../../../UI/Predict/components/PredictMarketSkeleton';
import { AppThemeKey } from '../../../../util/theme/models';
import { RootState } from '../../../../reducers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side
const CARD_SPACING = 16;

const PredictionSection = () => {
  const tw = useTailwind();
  const [activeIndex, setActiveIndex] = useState(0);
  const flashListRef = useRef<FlashListRef<PredictMarketType>>(null);

  const appTheme: AppThemeKey = useSelector(
    (state: RootState) => state.user.appTheme,
  );
  const osColorScheme = useColorScheme();
  const activeColor =
    appTheme === AppThemeKey.dark || osColorScheme === 'dark'
      ? 'bg-white'
      : 'bg-black';

  // Fetch prediction market data with limit of 6
  const { marketData, isFetching } = usePredictMarketData({
    category: 'trending',
    pageSize: 6,
  });

  // Limit to 6 items
  const carouselData = useMemo(
    () => (marketData ? marketData.slice(0, 6) : []),
    [marketData],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollPosition = event.nativeEvent.contentOffset.x;
      const index = Math.round(scrollPosition / (CARD_WIDTH + CARD_SPACING));
      setActiveIndex(index);
    },
    [],
  );

  const scrollToIndex = useCallback((index: number) => {
    flashListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
    setActiveIndex(index);
  }, []);

  const handleViewAll = useCallback(() => {
    // TODO: Navigate to predictions view all screen
    // eslint-disable-next-line no-console
    console.log('View all predictions');
  }, []);

  const renderCarouselItem = useCallback(
    ({ item, index }: { item: PredictMarketType; index: number }) => (
      <Box twClassName="mx-2" style={tw.style({ width: CARD_WIDTH })}>
        <PredictMarket
          market={item}
          entryPoint={PredictEventValues.ENTRY_POINT.PREDICT_FEED}
          testID={`prediction-carousel-card-${index + 1}`}
        />
      </Box>
    ),
    [tw],
  );

  const renderPaginationDots = useCallback(
    () => (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="mt-4 gap-2"
      >
        {carouselData.map((_, index) => (
          <Pressable
            key={`dot-${index}`}
            onPress={() => scrollToIndex(index)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Box
              twClassName="h-2 rounded-full transition-all"
              style={tw.style(
                activeIndex === index
                  ? `w-6 ${activeColor}`
                  : 'w-2 bg-border-muted',
              )}
            />
          </Pressable>
        ))}
      </Box>
    ),
    [carouselData, activeIndex, tw, scrollToIndex, activeColor],
  );

  // Show loading state while fetching
  if (isFetching) {
    return (
      <Box twClassName="mb-6">
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          alignItems={BoxAlignItems.Center}
          twClassName="px-1 mb-2"
        >
          <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
            {strings('wallet.predict')}
          </Text>
          <TouchableOpacity onPress={handleViewAll}>
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
              {strings('trending.view_all')}
            </Text>
          </TouchableOpacity>
        </Box>
        <Box style={tw.style({ height: 250 })}>
          <FlashList
            data={[1, 2, 3]}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={() => (
              <Box twClassName="mx-2" style={tw.style({ width: CARD_WIDTH })}>
                <PredictMarketSkeleton testID="prediction-carousel-skeleton" />
              </Box>
            )}
            keyExtractor={(item) => `skeleton-${item}`}
          />
        </Box>
      </Box>
    );
  }

  // Show empty state when no data
  if (carouselData.length === 0) {
    return null; // Don't show the section if there are no predictions
  }

  return (
    <Box twClassName="mb-6">
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        alignItems={BoxAlignItems.Center}
        twClassName="px-1 mb-2"
      >
        <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
          {strings('wallet.predict')}
        </Text>
        <TouchableOpacity onPress={handleViewAll}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
            {strings('trending.view_all')}
          </Text>
        </TouchableOpacity>
      </Box>

      <Box style={tw.style({ height: 250 })}>
        <FlashList
          ref={flashListRef}
          data={carouselData}
          renderItem={renderCarouselItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + CARD_SPACING}
          decelerationRate="fast"
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />
      </Box>

      <Box twClassName="px-1">{renderPaginationDots()}</Box>
    </Box>
  );
};

export default PredictionSection;
