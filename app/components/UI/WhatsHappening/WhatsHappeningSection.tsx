import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, SectionHeader } from '@metamask/design-system-react-native';
import ExploreSectionHeader from '../../Views/TrendingView/components/SectionHeader';
import type {
  ExploreTabName,
  ExploreSectionName,
} from '../../Views/TrendingView/search/analytics';
import ErrorState from '../../Views/Homepage/components/ErrorState';
import ViewMoreCard from '../../Views/Homepage/components/ViewMoreCard';
import { SectionRefreshHandle } from '../../Views/Homepage/types';
import { selectWhatsHappeningEnabled } from '../../../selectors/featureFlagController/whatsHappening';
import { PerpsStreamProvider } from '../Perps/providers/PerpsStreamManager';
import MarketInsightsDisclaimerBottomSheet from '../MarketInsights/components/MarketInsightsEntryCard/MarketInsightsDisclaimerBottomSheet';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import {
  SKELETON_CARD_COUNT,
  WHATS_HAPPENING_CARD_MIN_HEIGHT,
  WHATS_HAPPENING_CARD_WIDTH,
  WhatsHappeningInteractionType,
  WhatsHappeningView,
  WhatsHappeningSource,
  type WhatsHappeningSourceValue,
} from './constants';
import {
  useWhatsHappening,
  isWhatsHappeningSectionVisible,
  type UseWhatsHappeningResult,
} from './hooks';
import type { WhatsHappeningItem } from './types';
import {
  WhatsHappeningAIGeneratedLabel,
  WhatsHappeningCard,
  WhatsHappeningCardSkeleton,
} from './components';
import { WhatsHappeningSelectorsIDs } from './WhatsHappening.testIds';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { getWhatsHappeningEventProps } from './eventProperties';

const CARD_WIDTH = WHATS_HAPPENING_CARD_WIDTH;
const VIEW_MORE_MIN_HEIGHT_CLASS = `min-h-[${WHATS_HAPPENING_CARD_MIN_HEIGHT}px]`;
const GAP = 12;

const SKELETON_KEYS = Array.from(
  { length: SKELETON_CARD_COUNT },
  (__, i) => `skeleton-${i}`,
);

const styles = StyleSheet.create({
  sectionGap: { gap: 12 },
});

interface WhatsHappeningSectionProps {
  source: WhatsHappeningSourceValue;
  /** Optional callback fired when the section header is pressed, before navigation. */
  onHeaderPress?: () => void;
  /** Optional pre-fetched feed state (avoids duplicate requests in Explore). */
  feed?: UseWhatsHappeningResult;
  /** Tab context for Explore section analytics — pair with sectionName. */
  tabName?: ExploreTabName;
  /** Section context for Explore section analytics — pair with tabName. */
  sectionName?: ExploreSectionName;
}

const WhatsHappeningSection = forwardRef<
  SectionRefreshHandle,
  WhatsHappeningSectionProps
>(({ source, onHeaderPress, feed, tabName, sectionName }, ref) => {
  const currentIndexRef = useRef<number>(0);
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const isEnabled = useSelector(selectWhatsHappeningEnabled);
  const title = strings('whats_happening.title');
  const [isAIDisclaimerVisible, setIsAIDisclaimerVisible] = useState(false);

  const internalFeed = useWhatsHappening({
    enabled: feed === undefined,
  });
  const { items, isLoading, error, refresh } = feed ?? internalFeed;

  const snapOffsets = useMemo(
    () =>
      Array.from(
        { length: items.length + 1 },
        (_, i) => i * (CARD_WIDTH + GAP),
      ),
    [items.length],
  );

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const hasError = !isLoading && items.length === 0 && !!error;

  const navigateToDetail = useCallback(
    (initialIndex: number) => {
      navigation.navigate(Routes.WHATS_HAPPENING_DETAIL, {
        initialIndex,
        source,
      });
    },
    [navigation, source],
  );

  const handleViewAll = useCallback(() => {
    onHeaderPress?.();
    navigateToDetail(0);
  }, [onHeaderPress, navigateToDetail]);

  const handleCardPress = useCallback(
    (index: number) => {
      navigateToDetail(index);
    },
    [navigateToDetail],
  );

  const handleAIDisclaimerPress = useCallback(() => {
    setIsAIDisclaimerVisible(true);
  }, []);

  const handleAIDisclaimerClose = useCallback(() => {
    setIsAIDisclaimerVisible(false);
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / (CARD_WIDTH + GAP));
      if (index !== currentIndexRef.current) {
        currentIndexRef.current = index;
        const item = items[index];
        if (item) {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.WHATS_HAPPENING_INTERACTED)
              .addProperties({
                ...getWhatsHappeningEventProps(item, index, source),
                interaction_type: WhatsHappeningInteractionType.Pan,
                view: WhatsHappeningView.Carousel,
              })
              .build(),
          );
        }
      }
    },
    [trackEvent, createEventBuilder, items, source],
  );

  if (!isEnabled) {
    return null;
  }

  const isExploreSection = tabName !== undefined && sectionName !== undefined;
  const showAIGeneratedLabel = !hasError && !isLoading && items.length > 0;

  const aiGeneratedSubtitle = showAIGeneratedLabel ? (
    <WhatsHappeningAIGeneratedLabel
      onInfoPress={handleAIDisclaimerPress}
      testID={WhatsHappeningSelectorsIDs.AI_GENERATED_LABEL}
    />
  ) : null;

  const header = isExploreSection ? (
    <Box>
      <ExploreSectionHeader
        title={title}
        onViewAll={handleViewAll}
        testID={WhatsHappeningSelectorsIDs.SECTION_TITLE}
        tabName={tabName}
        sectionName={sectionName}
        titleTwClassName={aiGeneratedSubtitle ? 'pb-1' : undefined}
      />
      {aiGeneratedSubtitle ? (
        <Box twClassName="mb-3 px-4">{aiGeneratedSubtitle}</Box>
      ) : null}
    </Box>
  ) : (
    <SectionHeader
      title={title}
      isInteractive
      onPress={handleViewAll}
      testID={WhatsHappeningSelectorsIDs.SECTION_TITLE}
    >
      {aiGeneratedSubtitle}
    </SectionHeader>
  );

  const carouselContent = hasError ? (
    <ErrorState
      title={strings('homepage.error.unable_to_load', {
        section: title.toLowerCase(),
      })}
      onRetry={refresh}
    />
  ) : (
    <PerpsStreamProvider>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.style('px-4 gap-3')}
        snapToOffsets={snapOffsets}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumScrollEnd}
        testID={WhatsHappeningSelectorsIDs.CAROUSEL}
      >
        {isLoading ? (
          SKELETON_KEYS.map((key) => <WhatsHappeningCardSkeleton key={key} />)
        ) : (
          <>
            {items.map((item: WhatsHappeningItem, index: number) => (
              <WhatsHappeningCard
                key={item.id}
                item={item}
                cardIndex={index}
                source={source}
                onPress={() => handleCardPress(index)}
              />
            ))}
            <ViewMoreCard
              onPress={handleViewAll}
              twClassName={`w-[180px] ${VIEW_MORE_MIN_HEIGHT_CLASS}`}
            />
          </>
        )}
      </ScrollView>
    </PerpsStreamProvider>
  );

  if (!isWhatsHappeningSectionVisible({ isLoading, items, error })) {
    return null;
  }

  const aiDisclaimerSheet = isAIDisclaimerVisible ? (
    <MarketInsightsDisclaimerBottomSheet onClose={handleAIDisclaimerClose} />
  ) : null;

  if (isExploreSection) {
    return (
      <>
        <Box>
          {header}
          {carouselContent}
        </Box>
        {aiDisclaimerSheet}
      </>
    );
  }

  return (
    <>
      <Box paddingBottom={3} style={styles.sectionGap}>
        {header}
        {carouselContent}
      </Box>
      {aiDisclaimerSheet}
    </>
  );
});

export default WhatsHappeningSection;
