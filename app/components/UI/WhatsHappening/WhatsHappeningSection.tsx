import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { TextVariant } from '@metamask/design-system-react-native';
import SectionHeader from '../../../component-library/components-temp/SectionHeader';
import ErrorState from '../../Views/Homepage/components/ErrorState';
import ViewMoreCard from '../../Views/Homepage/components/ViewMoreCard';
import { SectionRefreshHandle } from '../../Views/Homepage/types';
import { selectWhatsHappeningEnabled } from '../../../selectors/featureFlagController/whatsHappening';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import {
  MAX_ITEMS_DISPLAYED,
  WhatsHappeningInteractionType,
  WhatsHappeningView,
  type WhatsHappeningSourceValue,
} from './constants';
import { useWhatsHappening } from './hooks';
import type { WhatsHappeningItem } from './types';
import { WhatsHappeningCard, WhatsHappeningCardSkeleton } from './components';
import { WhatsHappeningSelectorsIDs } from './WhatsHappening.testIds';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { getWhatsHappeningEventProps } from './eventProperties';

const CARD_WIDTH = 280;
const GAP = 12;

const SNAP_OFFSETS = Array.from(
  { length: MAX_ITEMS_DISPLAYED },
  (_, i) => i * (CARD_WIDTH + GAP),
);

const SKELETON_KEYS = Array.from(
  { length: MAX_ITEMS_DISPLAYED },
  (__, i) => `skeleton-${i}`,
);

const styles = StyleSheet.create({
  sectionGap: { gap: 12 },
});

interface WhatsHappeningSectionProps {
  source: WhatsHappeningSourceValue;
}

const WhatsHappeningSection = forwardRef<
  SectionRefreshHandle,
  WhatsHappeningSectionProps
>(({ source }, ref) => {
  const currentIndexRef = useRef<number>(0);
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);

  const handleFirstCardLayout = useCallback(
    (height: number) => {
      if (!cardHeight) setCardHeight(height);
    },
    [cardHeight],
  );
  const tw = useTailwind();
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const isEnabled = useSelector(selectWhatsHappeningEnabled);
  const title = strings('whats_happening.title');

  const { items, isLoading, error, refresh } =
    useWhatsHappening(MAX_ITEMS_DISPLAYED);

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
    navigateToDetail(0);
  }, [navigateToDetail]);

  const handleCardPress = useCallback(
    (index: number) => {
      navigateToDetail(index);
    },
    [navigateToDetail],
  );

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

  if (hasError) {
    return (
      <View style={styles.sectionGap}>
        <SectionHeader
          title={title}
          onPress={handleViewAll}
          testID={WhatsHappeningSelectorsIDs.SECTION_TITLE}
        />
        <ErrorState
          title={strings('homepage.error.unable_to_load', {
            section: title.toLowerCase(),
          })}
          onRetry={refresh}
        />
      </View>
    );
  }

  if (!isLoading && items.length === 0) {
    return null;
  }

  return (
    <View style={styles.sectionGap}>
      <SectionHeader
        title={title}
        onPress={handleViewAll}
        testID={WhatsHappeningSelectorsIDs.SECTION_TITLE}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.style('px-4 gap-3')}
        snapToOffsets={SNAP_OFFSETS}
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
                onCardLayout={index === 0 ? handleFirstCardLayout : undefined}
              />
            ))}
            <ViewMoreCard
              onPress={handleViewAll}
              twClassName={`w-[180px]${cardHeight ? ` h-[${cardHeight}px]` : ''}`}
              textVariant={TextVariant.BodyLg}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
});

export default WhatsHappeningSection;
