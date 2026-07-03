import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LayoutChangeEvent } from 'react-native';
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  HeaderStandardAnimated,
  Text,
  // TextFieldSearch, // TODO(activity-redesign): restore with the unified list + filtering
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { ActivityScreenSelectorsIDs } from './ActivityScreen.testIds';
import ActivityTypeFilterSheet, {
  ACTIVITY_TYPE_FILTER_LABEL_KEY,
} from './components/ActivityTypeFilterSheet';
import PerpsActivityFilterSheet, {
  PERPS_ACTIVITY_FILTER_LABEL_KEY,
} from './components/PerpsActivityFilterSheet';
import AssetListControlBar from './components/AssetListControlBar';
import ActivityList, {
  // eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
  type ActivityListHandle,
  // eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
} from '../ActivityList';
import { TrendingTokenNetworkBottomSheet } from '../../UI/Trending/components/TrendingTokensBottomSheet/TrendingTokenNetworkBottomSheet';
import type { CaipChainId } from '@metamask/utils';
import {
  ActivityTypeFilter,
  PerpsActivityFilter,
  getPerpsSubFilterKinds,
  resolveInitialActivityTypeFilter,
  type ActivityScreenParams,
} from './types';
import { useNetworkFilterOptions } from './hooks/useNetworkFilterOptions';
import { useParams } from '../../../util/navigation/navUtils';
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

  // TODO(activity-redesign): restore the search input with the unified list + filtering.
  // const [searchQuery, setSearchQuery] = useState('');
  // TODO: restore `ActivityTypeFilter.All` as the default once data-source
  // unification lands. See `ACTIVITY_TYPE_FILTER_ORDER` in ./types.ts.
  const params = useParams<ActivityScreenParams>();
  const {
    initialTypeFilter: initialTypeFilterParam,
    redirectToPerpsTransactions: redirectToPerpsParam,
    redirectToOrders: redirectToOrdersParam,
    initialPerpsFilter: initialPerpsFilterParam,
  } = params;
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>(() =>
    resolveInitialActivityTypeFilter(params),
  );
  const [isTypeSheetOpen, setIsTypeSheetOpen] = useState(false);
  const [networkFilter, setNetworkFilter] = useState<CaipChainId[] | null>(
    null,
  );
  const [isNetworkSheetOpen, setIsNetworkSheetOpen] = useState(false);
  const [perpsFilter, setPerpsFilter] = useState<PerpsActivityFilter>(
    () => initialPerpsFilterParam ?? PerpsActivityFilter.Trades,
  );
  const [isPerpsSheetOpen, setIsPerpsSheetOpen] = useState(false);

  const networkOptions = useNetworkFilterOptions();

  // TODO(activity-redesign): restore with the search input.
  // const handleClearSearch = useCallback(() => {
  //   setSearchQuery('');
  // }, []);

  const handleOpenTypeSheet = useCallback(() => {
    setIsTypeSheetOpen(true);
  }, []);

  const handleCloseTypeSheet = useCallback(() => {
    setIsTypeSheetOpen(false);
  }, []);

  const handleSelectTypeFilter = useCallback((filter: ActivityTypeFilter) => {
    setTypeFilter(filter);
    if (filter !== ActivityTypeFilter.Perps) {
      setPerpsFilter(PerpsActivityFilter.Trades);
    }
  }, []);

  useEffect(() => {
    if (
      initialTypeFilterParam === undefined &&
      !redirectToPerpsParam &&
      !redirectToOrdersParam &&
      initialPerpsFilterParam === undefined
    ) {
      return;
    }
    const resolvedTypeFilter = resolveInitialActivityTypeFilter({
      initialTypeFilter: initialTypeFilterParam,
      redirectToPerpsTransactions: redirectToPerpsParam,
      redirectToOrders: redirectToOrdersParam,
    });
    handleSelectTypeFilter(resolvedTypeFilter);
    if (resolvedTypeFilter === ActivityTypeFilter.Perps) {
      setPerpsFilter(initialPerpsFilterParam ?? PerpsActivityFilter.Trades);
    }
    navigation.setParams({
      initialTypeFilter: undefined,
      redirectToPerpsTransactions: undefined,
      redirectToOrders: undefined,
      initialPerpsFilter: undefined,
    });
  }, [
    initialTypeFilterParam,
    redirectToPerpsParam,
    redirectToOrdersParam,
    initialPerpsFilterParam,
    handleSelectTypeFilter,
    navigation,
  ]);

  const typeFilterLabel = strings(ACTIVITY_TYPE_FILTER_LABEL_KEY[typeFilter]);

  const showPerpsFilter = typeFilter === ActivityTypeFilter.Perps;
  const showNetworkFilter =
    typeFilter !== ActivityTypeFilter.Perps &&
    typeFilter !== ActivityTypeFilter.Predictions;

  const effectiveNetworkFilter = useMemo<CaipChainId[] | null>(
    () => (showNetworkFilter ? networkFilter : null),
    [showNetworkFilter, networkFilter],
  );

  const isNetworkFilterActive =
    Array.isArray(effectiveNetworkFilter) && effectiveNetworkFilter.length > 0;
  const selectedNetworkName = isNetworkFilterActive
    ? networkOptions.find((n) => n.caipChainId === effectiveNetworkFilter[0])
        ?.name
    : undefined;
  const networkFilterLabel =
    isNetworkFilterActive && selectedNetworkName
      ? selectedNetworkName
      : strings('activity_view.filter_all_networks');

  const perpsFilterLabel = strings(
    PERPS_ACTIVITY_FILTER_LABEL_KEY[perpsFilter],
  );

  const handleOpenNetworkSheet = useCallback(() => {
    setIsNetworkSheetOpen(true);
  }, []);

  const handleCloseNetworkSheet = useCallback(() => {
    setIsNetworkSheetOpen(false);
  }, []);

  const handleSelectNetwork = useCallback((chainIds: CaipChainId[] | null) => {
    setNetworkFilter(chainIds);
  }, []);

  const handleOpenPerpsSheet = useCallback(() => {
    setIsPerpsSheetOpen(true);
  }, []);

  const handleClosePerpsSheet = useCallback(() => {
    setIsPerpsSheetOpen(false);
  }, []);

  const handleSelectPerpsFilter = useCallback((filter: PerpsActivityFilter) => {
    setPerpsFilter(filter);
  }, []);

  const typeChip = useMemo(
    () => ({
      label: typeFilterLabel,
      onPress: handleOpenTypeSheet,
      testID: ActivityScreenSelectorsIDs.TYPE_FILTER_CHIP,
    }),
    [typeFilterLabel, handleOpenTypeSheet],
  );

  const secondaryChip = useMemo(() => {
    if (showPerpsFilter) {
      return {
        label: perpsFilterLabel,
        onPress: handleOpenPerpsSheet,
        testID: ActivityScreenSelectorsIDs.PERPS_FILTER_CHIP,
      };
    }
    if (showNetworkFilter) {
      return {
        label: networkFilterLabel,
        onPress: handleOpenNetworkSheet,
        testID: ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP,
      };
    }
    return null;
  }, [
    showPerpsFilter,
    showNetworkFilter,
    perpsFilterLabel,
    networkFilterLabel,
    handleOpenPerpsSheet,
    handleOpenNetworkSheet,
  ]);

  const subFilterKinds = showPerpsFilter
    ? getPerpsSubFilterKinds(perpsFilter)
    : undefined;

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

  const activityListHeader = useMemo(
    () => (
      <Box>
        <Box twClassName="px-4" onLayout={handleTitleLayout}>
          <Box twClassName="pb-4">
            <Text variant={TextVariant.HeadingLg}>
              {strings('activity_view.title')}
            </Text>
          </Box>

          {/* TODO(activity-redesign): restore the search input with the unified list + filtering.
          <Box twClassName="pb-4">
            <TextFieldSearch
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={strings('activity_view.search_placeholder')}
              onPressClearButton={handleClearSearch}
              testID={ActivityScreenSelectorsIDs.SEARCH_INPUT}
            />
          </Box>
          */}
        </Box>

        <AssetListControlBar
          typeChip={typeChip}
          secondaryChip={secondaryChip}
        />
      </Box>
    ),
    [handleTitleLayout, typeChip, secondaryChip],
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
              subFilterKinds={subFilterKinds}
            />

            {isFilterBarPinned ? (
              <Box twClassName="absolute top-0 left-0 right-0 bg-default">
                {/* TODO(activity-redesign): restore the search input with the unified list + filtering.
                <Box twClassName="pb-4">
                  <TextFieldSearch
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={strings('activity_view.search_placeholder')}
                    onPressClearButton={handleClearSearch}
                  />
                </Box>
                */}
                <AssetListControlBar
                  typeChip={typeChip}
                  secondaryChip={secondaryChip}
                  suppressTestIDs
                />
              </Box>
            ) : null}
          </Box>
        </Box>

        {isTypeSheetOpen ? (
          <ActivityTypeFilterSheet
            selected={typeFilter}
            onSelect={handleSelectTypeFilter}
            onClose={handleCloseTypeSheet}
          />
        ) : null}

        {isPerpsSheetOpen ? (
          <PerpsActivityFilterSheet
            selected={perpsFilter}
            onSelect={handleSelectPerpsFilter}
            onClose={handleClosePerpsSheet}
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
