import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import type { Article } from '@metamask/ai-controllers';
import type { WhatsHappeningItem } from '../../UI/WhatsHappening/types';
import { strings } from '../../../../locales/i18n';
import { useWhatsHappening } from '../../UI/WhatsHappening/hooks';
import WhatsHappeningExpandedCardSkeleton from './components/WhatsHappeningExpandedCardSkeleton';
import {
  MAX_ITEMS_DISPLAYED,
  WhatsHappeningInteractionType,
  WhatsHappeningSource,
  WhatsHappeningView,
  type WhatsHappeningSourceValue,
} from '../../UI/WhatsHappening/constants';
import { getWhatsHappeningEventProps } from '../../UI/WhatsHappening/eventProperties';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ErrorState from '../Homepage/components/ErrorState/ErrorState';
import WhatsHappeningExpandedCard from './components/WhatsHappeningExpandedCard';
import WhatsHappeningSourcesBottomSheet from './components/WhatsHappeningSourcesBottomSheet';
import MarketInsightsDisclaimerBottomSheet from '../../UI/MarketInsights/components/MarketInsightsEntryCard/MarketInsightsDisclaimerBottomSheet';
import PageIndicator from './components/PageIndicator';
import { PerpsStreamProvider } from '../../UI/Perps/providers/PerpsStreamManager';
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

const DEFAULT_INITIAL_INDEX = 0;

interface WhatsHappeningDetailParams {
  initialIndex?: number;
  source: WhatsHappeningSourceValue;
}

const WhatsHappeningDetailView = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const route =
    useRoute<RouteProp<{ params: WhatsHappeningDetailParams }, 'params'>>();

  const initialIndex = route.params?.initialIndex ?? DEFAULT_INITIAL_INDEX;
  const source: WhatsHappeningSourceValue =
    route.params?.source ?? WhatsHappeningSource.Unknown;

  const { items, isLoading, error, refresh } =
    useWhatsHappening(MAX_ITEMS_DISPLAYED);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [cardHeight, setCardHeight] = useState(0);
  const [sourcesContext, setSourcesContext] = useState<{
    articles: Article[];
    item: WhatsHappeningItem;
    cardIndex: number;
  } | null>(null);
  const [isAIDisclaimerVisible, setIsAIDisclaimerVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const hasScrolledToInitial = useRef(false);

  const handleSourcesPress = useCallback(
    (
      articles: Article[],
      pressedItem: WhatsHappeningItem,
      pressedIndex: number,
    ) => {
      setSourcesContext({
        articles,
        item: pressedItem,
        cardIndex: pressedIndex,
      });
    },
    [],
  );

  const handleSourcesClose = useCallback(() => {
    setSourcesContext(null);
  }, []);

  const handleAIDisclaimerPress = useCallback(() => {
    setIsAIDisclaimerVisible(true);
  }, []);

  const handleAIDisclaimerClose = useCallback(() => {
    setIsAIDisclaimerVisible(false);
  }, []);

  const hasTrackedOpenedRef = useRef(false);
  const hasTrackedViewRef = useRef(false);
  const previousIndexRef = useRef(initialIndex);
  const { trackEvent, createEventBuilder } = useAnalytics();

  useEffect(() => {
    if (hasTrackedOpenedRef.current) return;
    hasTrackedOpenedRef.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WHATS_HAPPENING_DETAILS_OPENED)
        .addProperties({
          source,
          initial_index: initialIndex,
        })
        .build(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCarouselLayout = useCallback((e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0) setCardHeight(height);
  }, []);

  const handleContentSizeChange = useCallback(
    (contentWidth: number) => {
      if (
        !hasScrolledToInitial.current &&
        initialIndex > 0 &&
        contentWidth > initialIndex * SNAP_INTERVAL &&
        scrollViewRef.current
      ) {
        hasScrolledToInitial.current = true;
        scrollViewRef.current.scrollTo({
          x: initialIndex * SNAP_INTERVAL,
          animated: false,
        });
      }
    },
    [initialIndex],
  );

  useEffect(() => {
    if (
      !isLoading &&
      !hasTrackedViewRef.current &&
      items.length > 0 &&
      items[initialIndex]
    ) {
      hasTrackedViewRef.current = true;
      trackEvent(
        createEventBuilder(MetaMetricsEvents.WHATS_HAPPENING_DETAILS_VIEWED)
          .addProperties(
            getWhatsHappeningEventProps(
              items[initialIndex],
              initialIndex,
              source,
            ),
          )
          .build(),
      );
    }
  }, [isLoading, items, initialIndex, source, trackEvent, createEventBuilder]);

  const handleBackPress = useCallback(() => {
    const visible = items[currentIndex];
    if (visible) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.WHATS_HAPPENING_DETAILS_CLOSED)
          .addProperties(
            getWhatsHappeningEventProps(visible, currentIndex, source),
          )
          .build(),
      );
    }
    navigation.goBack();
  }, [navigation, items, currentIndex, source, trackEvent, createEventBuilder]);

  // Updates the dot indicator live during the drag.
  // Flips at 20% visibility (bias = 0.8) — responsive without being erratic.
  // No analytics here: mid-drag index changes are not reliable view signals.
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.max(
        0,
        Math.min(Math.floor(offsetX / SNAP_INTERVAL + 0.8), items.length - 1),
      );
      setCurrentIndex(index);
    },
    [items.length],
  );

  // Fires analytics once the carousel has fully settled on a card.
  // onMomentumScrollEnd always fires with snapToInterval, giving the true
  // final position — immune to mid-drag back-and-forth inflation.
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
            createEventBuilder(MetaMetricsEvents.WHATS_HAPPENING_DETAILS_VIEWED)
              .addProperties(
                getWhatsHappeningEventProps(newItem, index, source),
              )
              .build(),
          );
          trackEvent(
            createEventBuilder(MetaMetricsEvents.WHATS_HAPPENING_INTERACTED)
              .addProperties({
                ...getWhatsHappeningEventProps(newItem, index, source),
                interaction_type: WhatsHappeningInteractionType.Pan,
                view: WhatsHappeningView.Expanded,
              })
              .build(),
          );
        }
        previousIndexRef.current = index;
      }
    },
    [items, source, trackEvent, createEventBuilder],
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
            {strings('whats_happening.title')}
          </Text>
        </Box>
        <Box twClassName="w-10" />
      </Box>

      <PerpsStreamProvider>
        <Box twClassName="flex-1">
          {isLoading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw.style('px-4 gap-3 items-stretch')}
              testID="whats-happening-detail-skeleton"
            >
              {SKELETON_KEYS.map((key) => (
                <WhatsHappeningExpandedCardSkeleton
                  key={key}
                  cardWidth={CARD_WIDTH}
                />
              ))}
            </ScrollView>
          ) : hasError ? (
            <ErrorState
              title={strings('homepage.error.unable_to_load', {
                section: strings('whats_happening.title').toLowerCase(),
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
                onContentSizeChange={handleContentSizeChange}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onMomentumScrollEnd={handleScrollEnd}
                testID="whats-happening-detail-carousel"
              >
                {cardHeight > 0 &&
                  items.map((item: WhatsHappeningItem, index: number) => (
                    <WhatsHappeningExpandedCard
                      key={item.id}
                      item={item}
                      cardIndex={index}
                      cardWidth={CARD_WIDTH}
                      cardHeight={cardHeight}
                      source={source}
                      onSourcesPress={(articles) =>
                        handleSourcesPress(articles, item, index)
                      }
                      onAIDisclaimerPress={handleAIDisclaimerPress}
                    />
                  ))}
              </ScrollView>

              <PageIndicator count={items.length} activeIndex={currentIndex} />
            </>
          )}
        </Box>
      </PerpsStreamProvider>
      {sourcesContext && (
        <WhatsHappeningSourcesBottomSheet
          onClose={handleSourcesClose}
          articles={sourcesContext.articles}
          item={sourcesContext.item}
          cardIndex={sourcesContext.cardIndex}
          source={source}
        />
      )}
      {isAIDisclaimerVisible && (
        <MarketInsightsDisclaimerBottomSheet
          onClose={handleAIDisclaimerClose}
        />
      )}
    </SafeAreaView>
  );
};

export default WhatsHappeningDetailView;
