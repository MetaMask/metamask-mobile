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
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';

const PerpsMarketRowItemSkeleton = () => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.skeletonContainer}>
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

  const handleRefresh = () => {
    if (activeTab === 'markets' && !isRefreshingMarkets) {
      refreshMarkets();
    } else if (activeTab === 'positions' && !isRefreshingPositions) {
      loadPositions();
    }
  };

  const handleBackPressed = () => {
    navigation.goBack();
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
    }
  };

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  // Load positions when positions tab is selected
  useEffect(() => {
    if (activeTab === 'positions') {
      loadPositions();
    }
    if (activeTab === 'markets') {
      refreshMarkets();
    }
  }, [activeTab, loadPositions, refreshMarkets]);

  const renderMarketList = () => {
    // Skeleton List
    if (filteredMarkets.length === 0 && isLoadingMarkets) {
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

        {activeTab === 'markets' && (
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
              {strings('perps.perps_markets')}
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
