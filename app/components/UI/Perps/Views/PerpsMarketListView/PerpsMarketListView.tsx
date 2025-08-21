import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, TouchableOpacity, Animated, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
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
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
import styleSheet from './PerpsMarketListView.styles';
import { PerpsMarketListViewProps } from './PerpsMarketListView.types';
import type {
  PerpsMarketData,
  PerpsNavigationParamList,
} from '../../controllers/types';
import { PerpsMarketListViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsPerformance } from '../../hooks';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';

const PerpsMarketRowItemSkeleton = () => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View
      style={styles.skeletonContainer}
      testID={PerpsMarketListViewSelectorsIDs.SKELETON_ROW}
    >
      <View style={styles.skeletonLeftSection}>
        {/* Avatar skeleton */}
        <Skeleton width={40} height={40} style={styles.skeletonAvatar} />
        <View style={styles.skeletonTokenInfo}>
          <View style={styles.skeletonTokenHeader}>
            {/* Token symbol skeleton */}
            <Skeleton
              width={60}
              height={16}
              style={styles.skeletonTokenSymbol}
            />
            {/* Leverage skeleton */}
            <Skeleton width={30} height={14} style={styles.skeletonLeverage} />
          </View>
          {/* Volume skeleton */}
          <Skeleton width={80} height={12} style={styles.skeletonVolume} />
        </View>
      </View>
      <View style={styles.skeletonRightSection}>
        {/* Price skeleton */}
        <Skeleton width={90} height={16} style={styles.skeletonPrice} />
        {/* Change skeleton */}
        <Skeleton width={70} height={14} style={styles.skeletonChange} />
      </View>
    </View>
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
  const hiddenButtonStyle = {
    position: 'absolute' as const,
    opacity: 0,
    pointerEvents: 'box-none' as const,
  };
  const [searchQuery, setSearchQuery] = useState('');
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

  const { track } = usePerpsEventTracking();
  const { startMeasure, endMeasure } = usePerpsPerformance();

  // Start measuring screen load time on mount
  useEffect(() => {
    startMeasure(PerpsMeasurementName.MARKETS_SCREEN_LOADED);
  }, [startMeasure]);

  const handleRefresh = () => {
    refreshMarkets();
  };

  const handleBackPressed = () => {
    navigation.goBack();
  };

  const filteredMarkets = useMemo(() => {
    // First filter out markets with no volume or $0 volume
    const marketsWithVolume = markets.filter((market: PerpsMarketData) => {
      // Check if volume exists and is not zero
      if (
        !market.volume ||
        market.volume === '$0' ||
        market.volume === '$0.00'
      ) {
        return false;
      }
      // Also filter out fallback display values
      if (market.volume === '$---' || market.volume === '---') {
        return false;
      }
      return true;
    });

    // Then apply search filter if needed
    if (!searchQuery.trim()) {
      return marketsWithVolume;
    }
    const query = searchQuery.toLowerCase().trim();
    return marketsWithVolume.filter(
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
      track(MetaMetricsEvents.PERPS_ASSET_SEARCH_BAR_CLICKED, {});
    }
  };

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  // Track screen load performance
  const hasTrackedMarketsView = useRef(false);
  const hasTrackedSkeletonDisplay = useRef(false);

  // Track skeleton display immediately
  useEffect(() => {
    if (isLoadingMarkets && !hasTrackedSkeletonDisplay.current) {
      // Measure time to skeleton display (should be instant)
      endMeasure(PerpsMeasurementName.MARKETS_SCREEN_LOADED);
      hasTrackedSkeletonDisplay.current = true;
    }
  }, [isLoadingMarkets, endMeasure]);

  useEffect(() => {
    // Track markets screen viewed event - only once when data is loaded
    if (markets.length > 0 && !hasTrackedMarketsView.current) {
      // Track event
      track(MetaMetricsEvents.PERPS_MARKETS_VIEWED, {
        [PerpsEventProperties.SOURCE]:
          PerpsEventValues.SOURCE.MAIN_ACTION_BUTTON,
      });

      hasTrackedMarketsView.current = true;
    }
  }, [markets, track]);
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
            data={filteredMarkets}
            renderItem={({ item }) => (
              <PerpsMarketRowItem market={item} onPress={handleMarketPress} />
            )}
            keyExtractor={(item: PerpsMarketData) => item.symbol}
            contentContainerStyle={styles.flashListContent}
            refreshing={isRefreshingMarkets}
            onRefresh={handleRefresh}
          />
        </Animated.View>
      </>
    );
  };

  const handleTutorialClick = () => {
    navigation.navigate(Routes.PERPS.TUTORIAL);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Hidden close button for navigation tests */}
      <TouchableOpacity
        onPress={handleClose}
        testID={PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}
        style={hiddenButtonStyle}
      />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <ButtonIcon
            iconName={IconName.Arrow2Left}
            size={ButtonIconSizes.Md}
            onPress={handleBackPressed}
          />
          <Text
            variant={TextVariant.HeadingLG}
            color={TextColor.Default}
            style={styles.headerTitle}
          >
            {strings('perps.title')}
          </Text>
        </View>
        <View style={styles.titleButtonsRightContainer}>
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
          <TouchableOpacity
            onPress={() => handleTutorialClick()}
            testID={PerpsMarketListViewSelectorsIDs.TUTORIAL_BUTTON}
            style={styles.tutorialButton}
          >
            <Icon name={IconName.Question} size={IconSize.Md} />
          </TouchableOpacity>
        </View>
      </View>

      {isSearchVisible && (
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
      <View style={styles.listContainer}>{renderMarketList()}</View>
    </SafeAreaView>
  );
};

export default PerpsMarketListView;
