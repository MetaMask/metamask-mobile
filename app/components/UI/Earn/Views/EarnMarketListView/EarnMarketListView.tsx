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
import EarnAssetRow from '../../../../Views/TrendingView/feeds/earn/EarnAssetRow';
import EarnMoneyAccountRow from '../../../../Views/TrendingView/feeds/earn/EarnMoneyAccountRow';
import { useEarnSearchFeed } from '../../../../Views/TrendingView/feeds/earn/useEarnSearchFeed';
import type { EarnSearchItem } from '../../../../Views/TrendingView/feeds/earn/earnSearchTypes';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import { earnAssetToToken, hasEarnAssetBalance } from '../../utils/earnAssets';
import Routes from '../../../../../constants/navigation/Routes';

const EarnMarketListSkeleton = () => (
  <Box testID="earn-market-list-loading" twClassName="px-4">
    {Array.from({ length: 3 }, (_, index) => (
      <Box
        key={`earn-market-list-skeleton-${index}`}
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

// TODO: Rename component; Doesn't only show markets. Maybe EarnSearchListView?
const EarnMarketListView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { navigateToMoneyHome } = useMoneyNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading } = useEarnSearchFeed({ query: searchQuery });

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleItemPress = useCallback(
    (item: EarnSearchItem) => {
      if (item.kind === 'money-account') {
        navigateToMoneyHome();
        return;
      }

      const { asset } = item;
      if (hasEarnAssetBalance(asset)) {
        navigation.navigate(Routes.EARN.ROOT, {
          screen: Routes.EARN.STRATEGY_SELECTION,
          params: { assetId: asset.assetId },
        });
        return;
      }

      const token = earnAssetToToken(asset);
      navigation.navigate('Asset', {
        ...token,
        source: TokenDetailsSource.ExploreEarn,
      });
    },
    [navigateToMoneyHome, navigation],
  );

  const renderItem: ListRenderItem<EarnSearchItem> = useCallback(
    ({ item }) =>
      item.kind === 'money-account' ? (
        <EarnMoneyAccountRow item={item} onPress={handleItemPress} />
      ) : (
        <EarnAssetRow item={item} onPress={handleItemPress} />
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
        testID="earn-market-list-header"
      />
      <Box twClassName="px-4 py-2">
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
            testID: 'earn-market-list-search',
          }}
        />
      </Box>
      {isLoading ? (
        <EarnMarketListSkeleton />
      ) : data.length === 0 ? (
        <Box testID="earn-market-list-empty" twClassName="flex-1">
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
          testID="earn-market-list"
        />
      )}
    </Box>
  );
};

export default EarnMarketListView;
