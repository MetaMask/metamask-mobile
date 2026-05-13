import React, { useCallback } from 'react';
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
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData } from '@metamask/perps-controller';
import type { PredictMarket as PredictMarketType } from '../../../../UI/Predict/types';
import type { SiteData } from '../../../../UI/Sites/components/SiteRowItem/SiteRowItem';
import PerpsSectionProvider from '../../feeds/perps/PerpsSectionProvider';
import SearchFeedRow from '../../search/SearchFeedRow';
import { useScrollTracking } from '../../search/analytics';
import type { SearchFeedId } from '../../search/useExploreSearch';

const SectionContent: React.FC<{
  feedId: SearchFeedId;
  searchQuery: string;
  data: unknown[];
  title: string;
}> = ({ feedId, searchQuery, data, title }) => {
  const tw = useTailwind();
  const { onScrollBeginDrag } = useScrollTracking(
    'view_all_scrolled',
    searchQuery,
    { section_name: title },
  );

  const renderItem: ListRenderItem<unknown> = useCallback(
    ({ item, index }) => (
      <SearchFeedRow
        feedId={feedId}
        item={item}
        index={index}
        searchQuery={searchQuery}
        sectionTitle={title}
        interactionType="view_all_item_clicked"
      />
    ),
    [feedId, searchQuery, title],
  );

  const keyExtractor = useCallback(
    (item: unknown, index: number) => {
      switch (feedId) {
        case 'tokens':
        case 'stocks':
          return `${feedId}-${(item as TrendingAsset).assetId ?? index}`;
        case 'perps':
          return `${feedId}-${(item as PerpsMarketData).symbol ?? index}`;
        case 'predictions':
          return `${feedId}-${(item as PredictMarketType).id ?? index}`;
        case 'sites':
          return `${feedId}-${(item as SiteData).url ?? index}`;
      }
    },
    [feedId],
  );

  return (
    <FlashList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={tw.style('px-4')}
      showsVerticalScrollIndicator={false}
      onScrollBeginDrag={onScrollBeginDrag}
    />
  );
};

const ExploreSectionResultsFullView: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'ExploreSectionResultsFullView'>>();

  const { feedId, title, searchQuery, data } = route.params;
  const Wrapper = feedId === 'perps' ? PerpsSectionProvider : React.Fragment;

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
        <SectionContent
          feedId={feedId}
          searchQuery={searchQuery}
          data={data}
          title={title}
        />
      </Wrapper>
    </Box>
  );
};

export default ExploreSectionResultsFullView;
