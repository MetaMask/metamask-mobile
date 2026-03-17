import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { View, Animated } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import TextFieldSearch from '../../../../../component-library/components/Form/TextFieldSearch/TextFieldSearch';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import PerpsMarketBalanceActions from '../../components/PerpsMarketBalanceActions';
import PerpsMarketSortFieldBottomSheet from '../../components/PerpsMarketSortFieldBottomSheet';
import PerpsMarketFiltersBar from './components/PerpsMarketFiltersBar';
import PerpsMarketList from '../../components/PerpsMarketList';
import {
  usePerpsMarketListView,
  usePerpsMeasurement,
  usePerpsNavigation,
} from '../../hooks';
import { usePerpsLivePositions, usePerpsLiveAccount } from '../../hooks/stream';
import PerpsMarketRowSkeleton from './components/PerpsMarketRowSkeleton';
import styleSheet from './PerpsMarketListView.styles';
import { PerpsMarketListViewProps } from './PerpsMarketListView.types';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
  type MarketTypeFilter,
} from '@metamask/perps-controller';
import { PerpsMarketListViewSelectorsIDs } from '../../Perps.testIds';
import { useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TraceName } from '../../../../../util/trace';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { PerpsNavigationParamList } from '../../types/navigation';

const PerpsMarketListView = ({
  onMarketSelect,
  protocolId: _protocolId,
  variant: propVariant,
  title: propTitle,
  showBalanceActions: propShowBalanceActions,
  showWatchlistOnly: propShowWatchlistOnly,
}: PerpsMarketListViewProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const route =
    useRoute<RouteProp<PerpsNavigationParamList, 'PerpsMarketListView'>>();

  const perpsNavigation = usePerpsNavigation();

  const variant = route.params?.variant ?? propVariant ?? 'full';
  const title = route.params?.title ?? propTitle;
  const showBalanceActions =
    route.params?.showBalanceActions ?? propShowBalanceActions ?? true;
  const showWatchlistOnly =
    route.params?.showWatchlistOnly ?? propShowWatchlistOnly ?? false;
  const defaultMarketTypeFilter =
    route.params?.defaultMarketTypeFilter ?? 'all';

  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const [isSortFieldSheetVisible, setIsSortFieldSheetVisible] = useState(false);

  const {
    markets: filteredMarkets,
    searchState,
    sortState,
    favoritesState,
    marketTypeFilterState,
    marketCounts,
    isLoading: isLoadingMarkets,
    error,
  } = usePerpsMarketListView({
    enablePolling: false,
    showWatchlistOnly,
    defaultMarketTypeFilter,
    showZeroVolume: __DEV__,
  });

  const { searchQuery, setSearchQuery } = searchState;

  // Destructure sort state for easier access
  const { selectedOptionId, sortBy, direction, handleOptionChange } = sortState;

  // Destructure favorites state for easier access
  const { showFavoritesOnly } = favoritesState;

  // Destructure market type filter state
  const { marketTypeFilter, setMarketTypeFilter } = marketTypeFilterState;

  // Handler for market press (defined early to avoid use-before-define)
  const handleMarketPress = useCallback(
    (market: PerpsMarketData) => {
      if (onMarketSelect) {
        onMarketSelect(market);
      } else {
        perpsNavigation.navigateToMarketDetails(market, route.params?.source);
      }
    },
    [onMarketSelect, perpsNavigation, route.params?.source],
  );

  // Compute available categories based on market counts (hide empty categories)
  const availableCategories = useMemo(() => {
    const categories: Exclude<MarketTypeFilter, 'all'>[] = [];
    if (marketCounts.crypto > 0) categories.push('crypto');
    if (marketCounts.equity > 0) categories.push('stocks');
    if (marketCounts.commodity > 0) categories.push('commodities');
    if (marketCounts.forex > 0) categories.push('forex');
    if (marketCounts.new > 0) categories.push('new');
    return categories;
  }, [marketCounts]);

  const { track } = usePerpsEventTracking();

  // Handle category badge selection
  const handleCategorySelect = useCallback(
    (category: MarketTypeFilter) => {
      // Track analytics for category changes
      const categoryMap: Record<string, string | null> = {
        crypto: PERPS_EVENT_VALUE.BUTTON_CLICKED.CRYPTO,
        stocks: PERPS_EVENT_VALUE.BUTTON_CLICKED.STOCKS,
        commodities: PERPS_EVENT_VALUE.BUTTON_CLICKED.COMMODITIES,
        forex: PERPS_EVENT_VALUE.BUTTON_CLICKED.FOREX,
        new: PERPS_EVENT_VALUE.BUTTON_CLICKED.NEW,
        all: null,
      };

      const targetCategory = categoryMap[category];
      if (targetCategory) {
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
          [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]: targetCategory,
          [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
            PERPS_EVENT_VALUE.BUTTON_LOCATION.MARKET_LIST,
        });
      }
      setMarketTypeFilter(category);
    },
    [setMarketTypeFilter, track],
  );

  useEffect(() => {
    if (filteredMarkets.length > 0) {
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [filteredMarkets.length, fadeAnimation]);

  const handleBackPressed = perpsNavigation.navigateBack;

  // Performance tracking: Measure screen load time until market data is displayed
  usePerpsMeasurement({
    traceName: TraceName.PerpsMarketListView,
    conditions: [filteredMarkets.length > 0],
  });

  // Track markets screen viewed event
  const source =
    route.params?.source || PERPS_EVENT_VALUE.SOURCE.MAIN_ACTION_BUTTON;

  // Get perp balance status and provider info for tracking
  const { account: perpsAccount } = usePerpsLiveAccount({ throttleMs: 5000 });
  const livePositions = usePerpsLivePositions({ throttleMs: 5000 });
  const hasPerpBalance =
    livePositions.positions.length > 0 ||
    (!!perpsAccount?.totalBalance && parseFloat(perpsAccount.totalBalance) > 0);

  // Extract button_clicked and button_location from route params
  const buttonClicked = route.params?.button_clicked;
  const buttonLocation = route.params?.button_location;

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    conditions: [filteredMarkets.length > 0],
    properties: {
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
        PERPS_EVENT_VALUE.SCREEN_TYPE.MARKET_LIST,
      [PERPS_EVENT_PROPERTY.SOURCE]: source,
      [PERPS_EVENT_PROPERTY.HAS_PERP_BALANCE]: hasPerpBalance,
      ...(buttonClicked && {
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]: buttonClicked,
      }),
      ...(buttonLocation && {
        [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]: buttonLocation,
      }),
    },
  });

  const renderMarketList = () => {
    // Skeleton List - show immediately while loading
    if (isLoadingMarkets) {
      return (
        <View>
          {Array.from({ length: 8 }).map((_, index) => (
            //Using index as key is fine here because the list is static
            // eslint-disable-next-line react/no-array-index-key
            <PerpsMarketRowSkeleton
              key={index}
              testID={PerpsMarketListViewSelectorsIDs.SKELETON_ROW}
            />
          ))}
        </View>
      );
    }

    // Error (Failed to load markets)
    if (error && filteredMarkets.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Error}
            style={styles.errorText}
          >
            {strings('perps.failed_to_load_market_data')}
          </Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('perps.data_updates_automatically')}
          </Text>
        </View>
      );
    }

    // Empty favorites results - show when favorites filter is active but no favorites found
    if (showFavoritesOnly && filteredMarkets.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Icon
            name={IconName.Star}
            size={IconSize.Xl}
            color={theme.colors.icon.muted}
            style={styles.emptyStateIcon}
          />
          <Text
            variant={TextVariant.HeadingSM}
            color={TextColor.Default}
            style={styles.emptyStateTitle}
          >
            {strings('perps.no_favorites_found')}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            style={styles.emptyStateDescription}
          >
            {strings('perps.no_favorites_description')}
          </Text>
        </View>
      );
    }

    // Empty search results - show when user has typed and no markets match
    if (searchQuery.trim() && filteredMarkets.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Icon
            name={IconName.Search}
            size={IconSize.Xl}
            color={theme.colors.icon.muted}
            style={styles.emptyStateIcon}
          />
          <Text
            variant={TextVariant.HeadingSM}
            color={TextColor.Default}
            style={styles.emptyStateTitle}
          >
            {strings('perps.no_tokens_found')}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            style={styles.emptyStateDescription}
          >
            {searchQuery.trim()
              ? strings('perps.no_tokens_found_description', { searchQuery })
              : strings('perps.search_by_token_symbol')}
          </Text>
        </View>
      );
    }

    // Use reusable PerpsMarketList component
    return (
      <Animated.View
        style={[styles.animatedListContainer, { opacity: fadeAnimation }]}
      >
        <PerpsMarketList
          markets={filteredMarkets}
          onMarketPress={handleMarketPress}
          sortBy={sortBy}
          showBadge={false}
          filterKey={marketTypeFilter}
          testID={PerpsMarketListViewSelectorsIDs.MARKET_LIST}
        />
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderCompactStandard
        title={title || strings('perps.home.markets')}
        onBack={handleBackPressed}
        backButtonProps={{
          testID: `${PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}-back-button`,
        }}
        testID={PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}
      />

      {showBalanceActions && variant === 'full' && (
        <PerpsMarketBalanceActions />
      )}

      {!isLoadingMarkets && !error && (
        <View style={styles.searchBarRow}>
          <TextFieldSearch
            value={searchQuery}
            onChangeText={setSearchQuery}
            onPressClearButton={() => setSearchQuery('')}
            placeholder={strings('perps.search_by_token_symbol')}
            testID={PerpsMarketListViewSelectorsIDs.SEARCH_BAR}
            clearButtonProps={{
              testID: PerpsMarketListViewSelectorsIDs.SEARCH_CLEAR_BUTTON,
            }}
          />
        </View>
      )}

      {!isLoadingMarkets && !error && (
        <PerpsMarketFiltersBar
          selectedOptionId={selectedOptionId}
          onSortPress={() => setIsSortFieldSheetVisible(true)}
          marketTypeFilter={marketTypeFilter}
          onCategorySelect={handleCategorySelect}
          availableCategories={availableCategories}
          testID={PerpsMarketListViewSelectorsIDs.SORT_FILTERS}
        />
      )}

      {/* Market List - Single list with JavaScript filtering */}
      <View style={styles.listContainerWithTabBar}>{renderMarketList()}</View>

      {/* Sort Field Bottom Sheet */}
      <PerpsMarketSortFieldBottomSheet
        isVisible={isSortFieldSheetVisible}
        onClose={() => setIsSortFieldSheetVisible(false)}
        selectedOptionId={selectedOptionId}
        sortDirection={direction}
        onOptionSelect={handleOptionChange}
        testID={`${PerpsMarketListViewSelectorsIDs.SORT_FILTERS}-field-sheet`}
      />
    </SafeAreaView>
  );
};

export default PerpsMarketListView;
