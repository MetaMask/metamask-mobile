import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { useWhatsHappening } from '../Homepage/Sections/WhatsHappening/hooks';
import { WhatsHappeningCardSkeleton } from '../Homepage/Sections/WhatsHappening/components';
import { MAX_ITEMS_DISPLAYED } from '../Homepage/Sections/WhatsHappening/constants';
import { getWhatsHappeningEventProps } from '../Homepage/Sections/WhatsHappening/eventProperties';
import ErrorState from '../Homepage/components/ErrorState/ErrorState';
import WhatsHappeningExpandedCard from './components/WhatsHappeningExpandedCard';
import PageIndicator from './components/PageIndicator';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HORIZONTAL_PADDING = 16;
const GAP = 12;
export const CARD_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GAP;
const SNAP_INTERVAL = CARD_WIDTH + GAP;

const SKELETON_KEYS = Array.from(
  { length: MAX_ITEMS_DISPLAYED },
  (_, i) => `skeleton-${i}`,
);

interface WhatsHappeningDetailParams {
  initialIndex: number;
}

const WhatsHappeningDetailView = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const route =
    useRoute<RouteProp<{ params: WhatsHappeningDetailParams }, 'params'>>();

  const initialIndex = route.params?.initialIndex ?? 0;

  const { items, isLoading, error, refresh } =
    useWhatsHappening(MAX_ITEMS_DISPLAYED);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [cardHeight, setCardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const hasTrackedViewRef = useRef(false);
  const previousIndexRef = useRef(initialIndex);
  const { trackEvent, createEventBuilder } = useAnalytics();

  const handleCarouselLayout = useCallback((e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0) setCardHeight(height);
  }, []);

  useEffect(() => {
    if (
      initialIndex > 0 &&
      cardHeight > 0 &&
      scrollViewRef.current &&
      !isLoading
    ) {
      scrollViewRef.current.scrollTo({
        x: initialIndex * SNAP_INTERVAL,
        animated: false,
      });
    }
  }, [initialIndex, isLoading, cardHeight]);

  useEffect(() => {
    if (
      !isLoading &&
      !hasTrackedViewRef.current &&
      items.length > 0 &&
      items[initialIndex]
    ) {
      hasTrackedViewRef.current = true;
      trackEvent(
        createEventBuilder(MetaMetricsEvents.WHATS_HAPPENING_VIEWED)
          .addProperties(
            getWhatsHappeningEventProps(items[initialIndex], initialIndex),
          )
          .build(),
      );
    }
  }, [isLoading, items, initialIndex, trackEvent, createEventBuilder]);

  const handleBackPress = useCallback(() => {
    const visible = items[currentIndex];
    if (visible) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.WHATS_HAPPENING_CLOSED)
          .addProperties(getWhatsHappeningEventProps(visible, currentIndex))
          .build(),
      );
    }
    navigation.goBack();
  }, [navigation, items, currentIndex, trackEvent, createEventBuilder]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.max(
        0,
        Math.min(Math.round(offsetX / SNAP_INTERVAL), items.length - 1),
      );

      const prev = previousIndexRef.current;
      if (index !== prev) {
        const newItem = items[index];
        if (newItem) {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.WHATS_HAPPENING_VIEWED)
              .addProperties(getWhatsHappeningEventProps(newItem, index))
              .build(),
          );
        }
        previousIndexRef.current = index;
      }

      setCurrentIndex(index);
    },
    [items, trackEvent, createEventBuilder],
  );

  const hasError = !isLoading && items.length === 0 && !!error;

  return (
    <SafeAreaView style={tw`flex-1 bg-default`}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-2 py-2"
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={handleBackPress}
          testID="whats-happening-detail-back-button"
        />
        <Box twClassName="flex-1 items-center">
          <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
            {strings('homepage.sections.whats_happening')}
          </Text>
        </Box>
        <Box twClassName="w-10" />
      </Box>

      <Box twClassName="flex-1">
        {isLoading ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw.style('px-4 gap-3 items-stretch')}
            testID="whats-happening-detail-skeleton"
          >
            {SKELETON_KEYS.map((key) => (
              <WhatsHappeningCardSkeleton key={key} />
            ))}
          </ScrollView>
        ) : hasError ? (
          <ErrorState
            title={strings('homepage.error.unable_to_load', {
              section: strings(
                'homepage.sections.whats_happening',
              ).toLowerCase(),
            })}
            onRetry={refresh}
          />
        ) : (
          <>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={SNAP_INTERVAL}
              snapToAlignment="start"
              style={tw`flex-1`}
              contentContainerStyle={tw.style('px-4 gap-3')}
              onLayout={handleCarouselLayout}
              onMomentumScrollEnd={handleScrollEnd}
              testID="whats-happening-detail-carousel"
            >
              {cardHeight > 0 &&
                items.map((item, index) => (
                  <WhatsHappeningExpandedCard
                    key={item.id}
                    item={item}
                    cardIndex={index}
                    cardWidth={CARD_WIDTH}
                    cardHeight={cardHeight}
                  />
                ))}
            </ScrollView>

            <PageIndicator count={items.length} activeIndex={currentIndex} />
          </>
        )}
      </Box>
    </SafeAreaView>
  );
};

export default WhatsHappeningDetailView;
