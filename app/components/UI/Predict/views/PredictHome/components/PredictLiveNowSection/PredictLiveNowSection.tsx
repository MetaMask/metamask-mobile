import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  Box,
  BoxBorderColor,
  SectionHeader,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../../core/NavigationService/types';
import { strings } from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';
import Engine from '../../../../../../../core/Engine';
import PredictMarket from '../../../../components/PredictMarket';
import PredictMarketSkeleton from '../../../../components/PredictMarketSkeleton';
import { PaginationDots } from '../../../../components/PaginationDots/PaginationDots';
import { PredictEventValues } from '../../../../constants/eventNames';
import type { PredictMarket as PredictMarketType } from '../../../../types';
import { PREDICT_LIVE_NOW_SECTION_TEST_IDS } from './PredictLiveNowSection.testIds';
import { usePredictLiveNowSection } from './usePredictLiveNowSection';

// Cards peek the next item by occupying ~80% of the screen width, hinting that
// the rail is horizontally scrollable.
const CARD_WIDTH_RATIO = 0.8;
const CARD_HEIGHT = 220;
const CARD_GAP = 12;
const SKELETON_COUNT = 3;

interface PredictLiveNowSectionProps {
  testID?: string;
}

type CarouselItem = PredictMarketType | undefined;

/**
 * Predict home "Live Now" carousel (PRED-834).
 *
 * Horizontal rail interleaving live sports markets with the BTC Up/Down crypto
 * card (see {@link usePredictLiveNowSection}), reusing the shared
 * `PredictMarket` carousel card. Renders skeletons while loading and hides
 * itself entirely when there is no data (empty/error) so it never blocks the
 * home screen.
 */
const PredictLiveNowSection: React.FC<PredictLiveNowSectionProps> = ({
  testID = PREDICT_LIVE_NOW_SECTION_TEST_IDS.SECTION,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = useMemo(
    () => screenWidth * CARD_WIDTH_RATIO,
    [screenWidth],
  );
  // Cards snap on width + gap, so the active-dot math must divide by the same
  // interval (not just cardWidth) to stay in sync with the snapped card.
  const snapInterval = useMemo(() => cardWidth + CARD_GAP, [cardWidth]);
  const { items, isLoading, isEmpty } = usePredictLiveNowSection();
  const [activeIndex, setActiveIndex] = useState(0);

  const handleSeeAll = useCallback(() => {
    Engine.context.PredictController.trackHomeSectionInteraction({
      sectionId: PredictEventValues.SECTION_ID.LIVE_NOW,
      actionType: PredictEventValues.ACTION_TYPE.SEE_ALL,
      entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
    });
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.FEED,
      params: {
        feedId: 'live',
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      },
    });
  }, [navigation]);

  useEffect(() => {
    const lastIndex = items.length - 1;
    setActiveIndex((prev) =>
      lastIndex < 0 ? 0 : Math.min(Math.max(prev, 0), lastIndex),
    );
  }, [items.length]);

  const carouselData = useMemo<CarouselItem[]>(
    () =>
      isLoading ? Array.from<CarouselItem>({ length: SKELETON_COUNT }) : items,
    [isLoading, items],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const lastIndex = items.length - 1;
      if (lastIndex < 0) {
        return;
      }
      const offsetX = event.nativeEvent.contentOffset.x;
      const newIndex = Math.min(
        Math.max(0, Math.round(offsetX / snapInterval)),
        lastIndex,
      );
      setActiveIndex(newIndex);
    },
    [snapInterval, items.length],
  );

  const renderItem: ListRenderItem<CarouselItem> = useCallback(
    ({ item, index }) => {
      const isLastItem = index === carouselData.length - 1;

      return (
        <Box
          style={tw.style(
            { width: cardWidth, minHeight: CARD_HEIGHT },
            !isLastItem && { marginRight: CARD_GAP },
          )}
        >
          <Box
            borderColor={BoxBorderColor.BorderDefault}
            twClassName="rounded-2xl overflow-hidden"
          >
            {isLoading || !item ? (
              <PredictMarketSkeleton
                isCarousel
                testID={`${PREDICT_LIVE_NOW_SECTION_TEST_IDS.SKELETON_PREFIX}-${index}`}
              />
            ) : (
              <PredictMarket
                market={item}
                isCarousel
                entryPoint={PredictEventValues.ENTRY_POINT.CAROUSEL}
                testID={`${PREDICT_LIVE_NOW_SECTION_TEST_IDS.CARD_PREFIX}-${item.id}`}
              />
            )}
          </Box>
        </Box>
      );
    },
    [carouselData.length, cardWidth, isLoading, tw],
  );

  if (isEmpty) {
    return null;
  }

  return (
    <Box testID={testID}>
      {/* "See all" navigates to the generic PredictFeedView (feedId 'live'). */}
      <SectionHeader
        testID={PREDICT_LIVE_NOW_SECTION_TEST_IDS.HEADER}
        title={strings('predict.home.live_now_title')}
        isInteractive
        onPress={handleSeeAll}
        twClassName="p-0 mb-2"
      />

      <Box twClassName="-mx-4">
        <FlashList<CarouselItem>
          testID={PREDICT_LIVE_NOW_SECTION_TEST_IDS.CAROUSEL}
          data={carouselData}
          renderItem={renderItem}
          keyExtractor={(item, index) =>
            isLoading || !item
              ? `${PREDICT_LIVE_NOW_SECTION_TEST_IDS.SKELETON_PREFIX}-${index}`
              : `${PREDICT_LIVE_NOW_SECTION_TEST_IDS.CARD_PREFIX}-${item.id}`
          }
          contentContainerStyle={tw.style('px-4')}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={snapInterval}
          decelerationRate="fast"
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />
      </Box>

      {!isLoading && (
        <PaginationDots
          count={items.length}
          activeIndex={activeIndex}
          testID={PREDICT_LIVE_NOW_SECTION_TEST_IDS.PAGINATION_DOTS}
        />
      )}
    </Box>
  );
};

export default PredictLiveNowSection;
