import React, { useCallback, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { type SharedValue, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  HeaderStandardAnimated,
  Text,
  TextFieldSearch,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { ActivityScreenSelectorsIDs } from './ActivityScreen.testIds';
import ActivityTypeFilterSheet, {
  ACTIVITY_TYPE_FILTER_LABEL_KEY,
} from './components/ActivityTypeFilterSheet';
import AssetListControlBar from './components/AssetListControlBar';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ActivityList from '../ActivityList';
import { TrendingTokenNetworkBottomSheet } from '../../UI/Trending/components/TrendingTokensBottomSheet/TrendingTokenNetworkBottomSheet';
import type { CaipChainId } from '@metamask/utils';
import { ActivityTypeFilter } from './types';
import { useNetworkFilterOptions } from './hooks/useNetworkFilterOptions';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ErrorBoundary from '../ErrorBoundary';

const updateScrollY = (
  scrollY: SharedValue<number>,
  event: NativeSyntheticEvent<NativeScrollEvent>,
) => {
  scrollY.value = event.nativeEvent.contentOffset.y;
};

const ActivityScreen = () => {
  const tw = useTailwind();
  const navigation = useNavigation();

  const scrollY = useSharedValue(0);
  const titleSectionHeight = useSharedValue(0);

  const handleTitleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      titleSectionHeight.value = event.nativeEvent.layout.height;
    },
    [titleSectionHeight],
  );

  const [searchQuery, setSearchQuery] = useState('');
  // TODO: restore `ActivityTypeFilter.All` as the default once data-source
  // unification lands. See `ACTIVITY_TYPE_FILTER_ORDER` in ./types.ts.
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>(
    ActivityTypeFilter.Transactions,
  );
  const [isTypeSheetOpen, setIsTypeSheetOpen] = useState(false);
  const [networkFilter, setNetworkFilter] = useState<CaipChainId[] | null>(
    null,
  );
  const [isNetworkSheetOpen, setIsNetworkSheetOpen] = useState(false);

  const networkOptions = useNetworkFilterOptions();

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleOpenTypeSheet = useCallback(() => {
    setIsTypeSheetOpen(true);
  }, []);

  const handleCloseTypeSheet = useCallback(() => {
    setIsTypeSheetOpen(false);
  }, []);

  const handleSelectTypeFilter = useCallback((filter: ActivityTypeFilter) => {
    setTypeFilter(filter);
  }, []);

  const isTypeFilterActive = typeFilter !== ActivityTypeFilter.All;
  const typeFilterLabel = isTypeFilterActive
    ? strings('activity_view.filter_types_selected', {
        label: strings(ACTIVITY_TYPE_FILTER_LABEL_KEY[typeFilter]),
      })
    : strings('activity_view.filter_all_types');

  const isNetworkFilterActive =
    Array.isArray(networkFilter) && networkFilter.length > 0;
  const selectedNetworkName = isNetworkFilterActive
    ? networkOptions.find((n) => n.caipChainId === networkFilter[0])?.name
    : undefined;
  const networkFilterLabel =
    isNetworkFilterActive && selectedNetworkName
      ? strings('activity_view.filter_network_selected', {
          label: selectedNetworkName,
        })
      : strings('activity_view.filter_all_networks');

  const handleOpenNetworkSheet = useCallback(() => {
    setIsNetworkSheetOpen(true);
  }, []);

  const handleCloseNetworkSheet = useCallback(() => {
    setIsNetworkSheetOpen(false);
  }, []);

  const handleSelectNetwork = useCallback((chainIds: CaipChainId[] | null) => {
    setNetworkFilter(chainIds);
  }, []);

  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(Routes.HOME_TABS);
  }, [navigation]);

  const handleActivityListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      updateScrollY(scrollY, event);
    },
    [scrollY],
  );

  const activityListHeader = useMemo(
    () => (
      <>
        <Box onLayout={handleTitleLayout} twClassName="pb-4">
          <Text variant={TextVariant.HeadingLg}>
            {strings('activity_view.title')}
          </Text>
        </Box>

        <Box twClassName="pb-4">
          {/* No functionality yet, just a placeholder for the search input */}
          <TextFieldSearch
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={strings('activity_view.search_placeholder')}
            onPressClearButton={handleClearSearch}
            testID={ActivityScreenSelectorsIDs.SEARCH_INPUT}
          />
        </Box>

        <Box>
          <AssetListControlBar
            networkLabel={networkFilterLabel}
            isNetworkFilterActive={isNetworkFilterActive}
            onNetworkPress={handleOpenNetworkSheet}
            typeLabel={typeFilterLabel}
            isTypeFilterActive={isTypeFilterActive}
            onTypePress={handleOpenTypeSheet}
          />
        </Box>
      </>
    ),
    [
      handleClearSearch,
      handleOpenNetworkSheet,
      handleOpenTypeSheet,
      handleTitleLayout,
      isNetworkFilterActive,
      isTypeFilterActive,
      networkFilterLabel,
      searchQuery,
      typeFilterLabel,
    ],
  );

  return (
    <ErrorBoundary view="ActivityScreen">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={ActivityScreenSelectorsIDs.SAFE_AREA_VIEW}
      >
        <Box twClassName="flex-1 bg-default">
          <HeaderStandardAnimated
            testID={ActivityScreenSelectorsIDs.HEADER}
            includesTopInset
            title={strings('activity_view.title')}
            scrollY={scrollY}
            titleSectionHeight={titleSectionHeight}
            onBack={handleBackPress}
            backButtonProps={{ testID: ActivityScreenSelectorsIDs.BACK_BUTTON }}
          />

          <ActivityList
            header={activityListHeader}
            onScroll={handleActivityListScroll}
          />
        </Box>

        {isTypeSheetOpen ? (
          <ActivityTypeFilterSheet
            selected={typeFilter}
            onSelect={handleSelectTypeFilter}
            onClose={handleCloseTypeSheet}
          />
        ) : null}

        <TrendingTokenNetworkBottomSheet
          isVisible={isNetworkSheetOpen}
          onClose={handleCloseNetworkSheet}
          onNetworkSelect={handleSelectNetwork}
          selectedNetwork={networkFilter}
          networks={networkOptions}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default ActivityScreen;
