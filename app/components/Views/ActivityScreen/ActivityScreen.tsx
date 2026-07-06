import React, { useCallback, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
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
import ActivityList, {
  // eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
  type ActivityListHandle,
  // eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
} from '../ActivityList';
import { TrendingTokenNetworkBottomSheet } from '../../UI/Trending/components/TrendingTokensBottomSheet/TrendingTokenNetworkBottomSheet';
import type { CaipChainId } from '@metamask/utils';
import { ActivityTypeFilter } from './types';
import { useNetworkFilterOptions } from './hooks/useNetworkFilterOptions';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ErrorBoundary from '../ErrorBoundary';

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

  const isNetworkFilterDisabled =
    typeFilter === ActivityTypeFilter.Perps ||
    typeFilter === ActivityTypeFilter.Predictions;

  const effectiveNetworkFilter = useMemo<CaipChainId[] | null>(
    () => (isNetworkFilterDisabled ? null : networkFilter),
    [isNetworkFilterDisabled, networkFilter],
  );

  const isNetworkFilterActive =
    Array.isArray(effectiveNetworkFilter) && effectiveNetworkFilter.length > 0;
  const selectedNetworkName = isNetworkFilterActive
    ? networkOptions.find((n) => n.caipChainId === effectiveNetworkFilter[0])
        ?.name
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

  const activityListRef = useRef<ActivityListHandle>(null);

  const handleHeaderTitlePress = useCallback(() => {
    activityListRef.current?.scrollToTop();
  }, []);

  const [isFilterBarPinned, setIsFilterBarPinned] = useState(false);

  useAnimatedReaction(
    () =>
      titleSectionHeight.value > 0 && scrollY.value >= titleSectionHeight.value,
    (pinned, previous) => {
      if (pinned !== previous) {
        runOnJS(setIsFilterBarPinned)(pinned);
      }
    },
  );

  const pinnedFilterStyle = useAnimatedStyle(() => {
    const section = titleSectionHeight.value;
    return { opacity: section > 0 && scrollY.value >= section ? 1 : 0 };
  });

  const activityListHeader = useMemo(
    () => (
      <>
        <Box onLayout={handleTitleLayout}>
          <Box twClassName="pb-4">
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
        </Box>

        <Box>
          <AssetListControlBar
            networkLabel={networkFilterLabel}
            isNetworkFilterActive={isNetworkFilterActive}
            isNetworkFilterDisabled={isNetworkFilterDisabled}
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
      isNetworkFilterDisabled,
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
            titleProps={{
              onPress: handleHeaderTitlePress,
              suppressHighlighting: true,
              accessibilityRole: 'button',
            }}
            scrollY={scrollY}
            titleSectionHeight={titleSectionHeight}
            onBack={handleBackPress}
            backButtonProps={{ testID: ActivityScreenSelectorsIDs.BACK_BUTTON }}
          />

          <Box twClassName="flex-1">
            <ActivityList
              ref={activityListRef}
              header={activityListHeader}
              scrollY={scrollY}
              typeFilter={typeFilter}
              networkFilter={effectiveNetworkFilter}
            />

            <Animated.View
              pointerEvents={isFilterBarPinned ? 'auto' : 'none'}
              accessibilityElementsHidden={!isFilterBarPinned}
              importantForAccessibility={
                isFilterBarPinned ? 'auto' : 'no-hide-descendants'
              }
              style={[
                tw.style('absolute top-0 left-0 right-0 px-4 bg-default'),
                pinnedFilterStyle,
              ]}
            >
              <AssetListControlBar
                networkLabel={networkFilterLabel}
                isNetworkFilterActive={isNetworkFilterActive}
                isNetworkFilterDisabled={isNetworkFilterDisabled}
                onNetworkPress={handleOpenNetworkSheet}
                typeLabel={typeFilterLabel}
                isTypeFilterActive={isTypeFilterActive}
                onTypePress={handleOpenTypeSheet}
                suppressTestIDs
              />
            </Animated.View>
          </Box>
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
