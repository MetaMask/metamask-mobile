import React, { useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import {
  useNavigation,
  useRoute,
  RouteProp,
  NavigationProp,
} from '@react-navigation/native';
import type { RootStackParamList } from '../../../../../core/NavigationService/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  BoxFlexDirection,
  BoxAlignItems,
  FontWeight,
} from '@metamask/design-system-react-native';
import { SECTIONS_CONFIG, type SectionId } from '../../sections.config';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';
import { TapView, trackExploreEvent } from '../../utils/exploreSearch';

interface SectionContentProps {
  sectionId: SectionId;
  searchQuery: string;
}

const SectionContent: React.FC<SectionContentProps> = ({
  sectionId,
  searchQuery,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const section = SECTIONS_CONFIG[sectionId];
  const hasScrollTracked = useRef(false);

  const { data, isLoading } = section.useSectionData(searchQuery);

  const handleScroll = useCallback(() => {
    if (hasScrollTracked.current) return;
    hasScrollTracked.current = true;
    trackExploreEvent(MetaMetricsEvents.EXPLORE_SEARCH_VIEW_ALL_SCROLLED, {
      searchQuery,
      sectionName: section.title,
    });
  }, [searchQuery, section.title]);

  const renderItem: ListRenderItem<unknown> = useCallback(
    ({ item, index }) => {
      const RowItemComponent = section.OverrideRowItemSearch ?? section.RowItem;
      const { getItemIdentifier } = section;
      const handleItemTouch = getItemIdentifier
        ? () => {
            trackExploreEvent(
              MetaMetricsEvents.EXPLORE_SEARCH_VIEW_ALL_ITEM_CLICKED,
              {
                searchQuery,
                sectionName: section.title,
                itemClicked: getItemIdentifier(item),
              },
            );
          }
        : undefined;

      return (
        <TapView onTap={handleItemTouch}>
          <RowItemComponent
            item={item}
            index={index}
            navigation={navigation as never}
          />
        </TapView>
      );
    },
    [section, navigation, searchQuery],
  );

  const keyExtractor = useCallback(
    (_item: unknown, index: number) => `${sectionId}-${index}`,
    [sectionId],
  );

  if (isLoading) {
    const SkeletonComponent =
      section.OverrideSkeletonSearch ?? section.Skeleton;
    return (
      <Box twClassName="px-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonComponent key={`skeleton-${i}`} />
        ))}
      </Box>
    );
  }

  return (
    <FlashList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={tw.style('px-4')}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={400}
    />
  );
};

const ExploreSectionResultsFullView: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'ExploreSectionResultsFullView'>>();

  const { sectionId, title, searchQuery } = route.params;
  const section = SECTIONS_CONFIG[sectionId];
  const Wrapper = section.SectionWrapper ?? React.Fragment;

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <Box
      style={{ paddingTop: insets.top + (Platform.OS === 'android' ? 16 : 0) }}
      twClassName="flex-1 bg-default"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-4 pb-3 gap-3"
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Sm}
          onPress={handleGoBack}
          accessibilityLabel="Go back"
        />
        <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
          {title}
        </Text>
      </Box>

      <Wrapper>
        <SectionContent sectionId={sectionId} searchQuery={searchQuery} />
      </Wrapper>
    </Box>
  );
};

export default ExploreSectionResultsFullView;
