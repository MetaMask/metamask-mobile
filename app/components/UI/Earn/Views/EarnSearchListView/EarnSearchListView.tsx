import React, { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import {
  Box,
  HeaderStandard,
  Skeleton,
  TabEmptyState,
  TextFieldSearch,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useMoneyNavigation } from '../../../Money/hooks/useMoneyNavigation';
import useEarnOpportunityNavigation from '../../hooks/useEarnOpportunityNavigation';
import EarnSearchAssetRow from '../../../../Views/TrendingView/feeds/earn/EarnSearchAssetRow';
import EarnMoneyAccountRow from '../../../../Views/TrendingView/feeds/earn/EarnMoneyAccountRow';
import { useEarnSearchFeed } from '../../../../Views/TrendingView/feeds/earn/useEarnSearchFeed';
import type { EarnSearchItem } from '../../../../Views/TrendingView/feeds/earn/earnSearchTypes';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';

const EarnSearchListSkeleton = () => (
  <Box testID="earn-search-list-loading" twClassName="px-4">
    {Array.from({ length: 3 }, (_, index) => (
      <Box
        key={`earn-search-list-skeleton-${index}`}
        twClassName="flex-row items-center gap-3 py-3"
      >
        <Skeleton height={40} width={40} twClassName="rounded-full" />
        <Box twClassName="flex-1 gap-2">
          <Skeleton height={16} width={112} />
          <Skeleton height={20} width={88} />
        </Box>
        <Skeleton height={20} width={70} />
      </Box>
    ))}
  </Box>
);

const EarnSearchListView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { navigateToMoneyHome } = useMoneyNavigation();
  const { navigateToEarnOpportunity } = useEarnOpportunityNavigation({
    tokenDetailsSource: TokenDetailsSource.ExploreEarn,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading } = useEarnSearchFeed({ query: searchQuery });

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleItemPress = useCallback(
    (item: EarnSearchItem) => {
      if (item.kind === 'money-account') {
        navigateToMoneyHome({ pop: false });
        return;
      }

      navigateToEarnOpportunity(item.asset);
    },
    [navigateToEarnOpportunity, navigateToMoneyHome],
  );

  const renderItem: ListRenderItem<EarnSearchItem> = useCallback(
    ({ item }) =>
      item.kind === 'money-account' ? (
        <EarnMoneyAccountRow item={item} onPress={handleItemPress} />
      ) : (
        <EarnSearchAssetRow item={item} onPress={handleItemPress} />
      ),
    [handleItemPress],
  );

  const keyExtractor = useCallback((item: EarnSearchItem) => item.id, []);

  return (
    <Box twClassName="flex-1 bg-default">
      <HeaderStandard
        includesTopInset
        title={strings('homepage.sections.earn')}
        onBack={handleBack}
        testID="earn-search-list-header"
      />
      <Box twClassName="px-4 py-2 mb-4">
        <TextFieldSearch
          value={searchQuery}
          onChangeText={setSearchQuery}
          onPressClearButton={() => setSearchQuery('')}
          placeholder={strings('trending.search_placeholder')}
          inputProps={{
            autoComplete: 'off',
            autoCorrect: false,
            autoCapitalize: 'none',
            // TODO: Breakout testID into constant.
            testID: 'earn-search-list-search',
          }}
        />
      </Box>
      {isLoading ? (
        <EarnSearchListSkeleton />
      ) : data.length === 0 ? (
        <Box testID="earn-search-list-empty" twClassName="flex-1">
          <TabEmptyState
            description={strings('trending.no_results_for_query', {
              query: searchQuery,
            })}
          />
        </Box>
      ) : (
        <FlashList
          data={data}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          testID="earn-search-list"
          // Disable re-anchoring so filtered results do not shift during layout updates.
          maintainVisibleContentPosition={{ disabled: true }}
        />
      )}
    </Box>
  );
};

export default EarnSearchListView;
