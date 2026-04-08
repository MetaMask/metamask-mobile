import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { ScrollView, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, TextVariant } from '@metamask/design-system-react-native';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import ErrorState from '../../components/ErrorState';
import ViewMoreCard from '../../components/ViewMoreCard';
import { SectionRefreshHandle } from '../../types';
import { selectWhatsHappeningEnabled } from '../../../../../selectors/featureFlagController/whatsHappening';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useWhatsHappening } from './hooks';
import { WhatsHappeningCard, WhatsHappeningCardSkeleton } from './components';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';

const MAX_ITEMS_DISPLAYED = 5;

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

interface WhatsHappeningSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

const WhatsHappeningSection = forwardRef<
  SectionRefreshHandle,
  WhatsHappeningSectionProps
>(({ sectionIndex, totalSectionsLoaded }, ref) => {
  const sectionViewRef = useRef<View>(null);
  const tw = useTailwind();
  const navigation = useNavigation();
  const isEnabled = useSelector(selectWhatsHappeningEnabled);
  const title = strings('homepage.sections.whats_happening');

  const { items, isLoading, error, refresh } =
    useWhatsHappening(MAX_ITEMS_DISPLAYED);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const hasError = !isLoading && items.length === 0 && !!error;

  // Pass the real ref only when the section actually mounts a View (has items
  // or is showing the error state). When false, sectionRef: null triggers the
  // hook's immediate-fire path once loading completes, so the event still fires
  // for the truly-empty state (no items, no error) with isEmpty: true.
  const willRender = !isLoading && (items.length > 0 || hasError);

  const { onLayout } = useHomeViewedEvent({
    sectionRef: willRender ? sectionViewRef : null,
    isLoading,
    sectionName: HomeSectionNames.WHATS_HAPPENING,
    sectionIndex,
    totalSectionsLoaded,
    isEmpty: items.length === 0,
    itemCount: items.length,
  });

  const navigateToDetail = useCallback(
    (initialIndex: number) => {
      // TODO: When WhatsHappeningDetailView is implemented, pass only { initialIndex } — the
      // detail screen should call useWhatsHappening(); AiDigestController caches the response.
      navigation.navigate(Routes.WHATS_HAPPENING_DETAIL, {
        items,
        initialIndex,
      });
    },
    [navigation, items],
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

  if (!isEnabled) {
    return null;
  }

  if (hasError) {
    return (
      <View ref={sectionViewRef} onLayout={onLayout}>
        <Box gap={3}>
          <SectionHeader title={title} onPress={handleViewAll} />
          <ErrorState
            title={strings('homepage.error.unable_to_load', {
              section: title.toLowerCase(),
            })}
            onRetry={refresh}
          />
        </Box>
      </View>
    );
  }

  if (!isLoading && items.length === 0) {
    return null;
  }

  return (
    <View ref={sectionViewRef} onLayout={onLayout}>
      <Box gap={3}>
        <SectionHeader title={title} onPress={handleViewAll} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw.style('px-4 gap-3')}
          snapToOffsets={SNAP_OFFSETS}
          decelerationRate="fast"
          testID="homepage-whats-happening-carousel"
        >
          {isLoading ? (
            SKELETON_KEYS.map((key) => <WhatsHappeningCardSkeleton key={key} />)
          ) : (
            <>
              {items.map((item, index) => (
                <WhatsHappeningCard
                  key={item.id}
                  item={item}
                  onPress={() => handleCardPress(index)}
                />
              ))}
              <ViewMoreCard
                onPress={handleViewAll}
                twClassName="w-[180px] h-[248px]"
                textVariant={TextVariant.BodyLg}
              />
            </>
          )}
        </ScrollView>
      </Box>
    </View>
  );
});

export default WhatsHappeningSection;
