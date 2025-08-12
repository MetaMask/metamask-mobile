import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import performance from 'react-native-performance';
import { FlashList } from '@shopify/flash-list';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useStyles } from '../../../../../component-library/hooks';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import PerpsMarketRowItem from '../../components/PerpsMarketRowItem';
import PerpsPositionCard from '../../components/PerpsPositionCard';
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
import { usePerpsPositions } from '../../hooks';
import styleSheet from './PerpsMarketListView.styles';
import { PerpsMarketListViewProps } from './PerpsMarketListView.types';
import type {
  PerpsMarketData,
  PerpsNavigationParamList,
} from '../../controllers/types';
import { PerpsMarketListViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { measurePerformance } from '../../utils/perpsDebug';
import { useMetrics, MetaMetricsEvents } from '../../../../hooks/useMetrics';

const PerpsMarketRowItemSkeleton = () => {
  const { styles, theme } = useStyles(styleSheet, {});

  return (
    <SkeletonPlaceholder backgroundColor={theme.colors.background.alternative}>
      <View style={styles.skeletonContainer}>
        <View style={styles.skeletonLeftSection}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonTokenInfo}>
            <View style={styles.skeletonTokenHeader}>
              <View style={styles.skeletonTokenSymbol} />
              <View style={styles.skeletonLeverage} />
            </View>
            <View style={styles.skeletonVolume} />
          </View>
        </View>
        <View style={styles.skeletonRightSection}>
          <View style={styles.skeletonPrice} />
          <View style={styles.skeletonChange} />
        </View>
      </View>
    </SkeletonPlaceholder>
  );
};

const PerpsMarketListHeader = () => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.listHeader}>
      <View style={styles.listHeaderLeft}>
        <Text variant={TextVariant.BodySMMedium} color={TextColor.Muted}>
          {strings('perps.token_volume')}
        </Text>
      </View>
      <View style={styles.listHeaderRight}>
        <Text variant={TextVariant.BodySMMedium} color={TextColor.Muted}>
          {strings('perps.last_price_24h_change')}
        </Text>
      </View>
    </View>
  );
};

const PerpsMarketListView = ({
  onMarketSelect,
  protocolId: _protocolId,
}: PerpsMarketListViewProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const { top } = useSafeAreaInsets();
  const hiddenButtonStyle = {
    position: 'absolute' as const,
    opacity: 0,
    pointerEvents: 'box-none' as const,
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'markets' | 'positions'>(
    'markets',
  );
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const {
    markets,
    isLoading: isLoadingMarkets,
    error,
    refresh: refreshMarkets,
    isRefreshing: isRefreshingMarkets,
  } = usePerpsMarkets({
    enablePolling: false,
  });

  const {
    positions,
    isLoading: isLoadingPositions,
    isRefreshing: isRefreshingPositions,
    loadPositions,
  } = usePerpsPositions();

  useEffect(() => {
    if (markets.length > 0) {
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [markets.length, fadeAnimation]);

  const handleMarketPress = (market: PerpsMarketData) => {
    if (onMarketSelect) {
      onMarketSelect(market);
    } else {
      navigation.navigate(Routes.PERPS.MARKET_DETAILS, {
        market,
      });
    }
  };

  const { trackEvent, createEventBuilder } = useMetrics();

  const handleRefresh = () => {
    if (activeTab === 'markets' && !isRefreshingMarkets) {
      refreshMarkets();
    } else if (activeTab === 'positions' && !isRefreshingPositions) {
      loadPositions();
    }
  };

  const filteredMarkets = useMemo(() => {
    if (!searchQuery.trim()) {
      return markets;
    }
    const query = searchQuery.toLowerCase().trim();
    return markets.filter(
      (market: PerpsMarketData) =>
        market.symbol.toLowerCase().includes(query) ||
        market.name.toLowerCase().includes(query),
    );
  }, [markets, searchQuery]);

  const handleSearchToggle = () => {
    setIsSearchVisible(!isSearchVisible);
    if (isSearchVisible) {
      // Clear search when hiding search bar
      setSearchQuery('');
    } else {
      // Track search bar clicked event
      trackEvent(
        createEventBuilder(MetaMetricsEvents.PERPS_ASSET_SEARCH_BAR_CLICKED)
          .addProperties({
            [PerpsEventProperties.TIMESTAMP]: Date.now(),
          })
          .build(),
      );
    }
  };

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  // Track screen load performance
  const screenLoadStartRef = useRef<number>(performance.now());
  const hasTrackedMarketsView = useRef(false);
  const hasTrackedSkeletonDisplay = useRef(false);

  // Track skeleton display immediately
  useEffect(() => {
    if (
      activeTab === 'markets' &&
      isLoadingMarkets &&
      !hasTrackedSkeletonDisplay.current
    ) {
      // Measure time to skeleton display (should be instant)
      measurePerformance(
        PerpsMeasurementName.MARKETS_SCREEN_LOADED,
        screenLoadStartRef.current,
      );
      hasTrackedSkeletonDisplay.current = true;
    }
  }, [activeTab, isLoadingMarkets]);

  useEffect(() => {
    // Track markets screen viewed event - only once when data is loaded
    if (
      activeTab === 'markets' &&
      markets.length > 0 &&
      !hasTrackedMarketsView.current
    ) {
      // Track event
      trackEvent(
        createEventBuilder(MetaMetricsEvents.PERPS_MARKETS_VIEWED)
          .addProperties({
            [PerpsEventProperties.TIMESTAMP]: Date.now(),
            [PerpsEventProperties.SOURCE]:
              PerpsEventValues.SOURCE.MAIN_ACTION_BUTTON,
          })
          .build(),
      );

      hasTrackedMarketsView.current = true;
    }
  }, [markets, activeTab, trackEvent, createEventBuilder]);

  // Load positions when positions tab is selected
  useEffect(() => {
    if (activeTab === 'positions') {
      loadPositions();
    }
    if (activeTab === 'markets') {
      refreshMarkets();
    }
  }, [activeTab, loadPositions, refreshMarkets]);

  // Track position data loaded - separate effect without positions dependency
  useEffect(() => {
    if (
      activeTab === 'positions' &&
      positions &&
      positions.length >= 0 &&
      !isLoadingPositions
    ) {
      const positionLoadStart = performance.now();
      measurePerformance(
        PerpsMeasurementName.POSITION_DATA_LOADED_PERP_TAB,
        positionLoadStart,
      );
    }
  }, [activeTab, positions, isLoadingPositions]);

  const renderMarketList = () => {
    // Skeleton List - show immediately while loading
    if (isLoadingMarkets) {
      return (
        <View>
          <PerpsMarketListHeader />
          {Array.from({ length: 8 }).map((_, index) => (
            //Using index as key is fine here because the list is static
            // eslint-disable-next-line react/no-array-index-key
            <View key={index}>
              <PerpsMarketRowItemSkeleton />
            </View>
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
          <TouchableOpacity onPress={handleRefresh}>
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
              {strings('perps.tap_to_retry')}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <PerpsMarketListHeader />
        <Animated.View
          style={[styles.animatedListContainer, { opacity: fadeAnimation }]}
        >
          <FlashList
            style={styles.animatedListContainer}
            data={filteredMarkets}
            renderItem={({ item }) => (
              <PerpsMarketRowItem market={item} onPress={handleMarketPress} />
            )}
            keyExtractor={(item: PerpsMarketData) => item.symbol}
            contentContainerStyle={styles.flashListContent}
            refreshing={
              activeTab === 'markets'
                ? isRefreshingMarkets
                : isRefreshingPositions
            }
            onRefresh={handleRefresh}
          />
        </Animated.View>
      </>
    );
  };

  const renderPositionsList = () => {
    // Loading state
    if (isLoadingPositions) {
      return (
        <View style={styles.errorContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {strings('perps.loading_positions')}
          </Text>
        </View>
      );
    }

    if (isRefreshingPositions) {
      return (
        <View style={styles.errorContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {strings('perps.refreshing_positions')}
          </Text>
        </View>
      );
    }

    // Empty state
    if (positions.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {strings('perps.no_positions_found')}
          </Text>
        </View>
      );
    }

    // Positions list
    return (
      <ScrollView
        style={styles.animatedListContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingPositions}
            onRefresh={handleRefresh}
          />
        }
      >
        {positions.map((position, index) => (
          <PerpsPositionCard
            key={`${position.coin}-${index}`}
            position={position}
            expanded={false}
            showIcon
          />
        ))}
      </ScrollView>
    );
  };

  const handleTutorialClick = () => {
    navigation.navigate(Routes.PERPS.TUTORIAL);
  };

  return (
    <SafeAreaView style={[styles.container, { marginTop: top }]}>
      {/* Hidden close button for navigation tests */}
      <TouchableOpacity
        onPress={handleClose}
        testID={PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}
        style={hiddenButtonStyle}
      />
      {/* Header */}
      <View style={styles.header}>
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={styles.headerTitle}
        >
          {strings('perps.perpetuals')}
        </Text>
        <View style={styles.headerActions}>
          {activeTab === 'markets' && (
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearchToggle}
              testID={PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON}
            >
              <Icon
                name={isSearchVisible ? IconName.Close : IconName.Search}
                size={IconSize.Md}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => handleTutorialClick()}
            testID={PerpsMarketListViewSelectorsIDs.TUTORIAL_BUTTON}
            style={styles.tutorialButton}
          >
            <Icon name={IconName.Question} size={IconSize.Md} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Buttons or Search Bar */}
      {!isSearchVisible ? (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'markets'
                ? styles.tabButtonActive
                : styles.tabButtonInactive,
            ]}
            onPress={() => setActiveTab('markets')}
          >
            <Text
              variant={TextVariant.BodyMDBold}
              color={
                activeTab === 'markets' ? TextColor.Default : TextColor.Muted
              }
            >
              {strings('perps.perpetual_markets')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'positions'
                ? styles.tabButtonActive
                : styles.tabButtonInactive,
            ]}
            onPress={() => setActiveTab('positions')}
          >
            <Text
              variant={TextVariant.BodyMDBold}
              color={
                activeTab === 'positions' ? TextColor.Default : TextColor.Muted
              }
            >
              {strings('perps.your_positions')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon
              name={IconName.Search}
              size={IconSize.Lg}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={strings('perps.search')}
              placeholderTextColor={theme.colors.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
                testID={PerpsMarketListViewSelectorsIDs.SEARCH_CLEAR_BUTTON}
              >
                <Icon name={IconName.Close} size={IconSize.Sm} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      <View style={styles.listContainer}>
        {activeTab === 'markets' ? renderMarketList() : renderPositionsList()}
      </View>
    </SafeAreaView>
  );
};

export default PerpsMarketListView;
