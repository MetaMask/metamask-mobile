import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  TextInput,
} from 'react-native';
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
import { useNavigation } from '@react-navigation/native';
import PerpsMarketRowItem from '../../components/PerpsMarketRowItem';
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
import { usePerpsConnection } from '../../providers/PerpsConnectionProvider';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import styleSheet from './PerpsMarketListView.styles';
import {
  PerpsMarketData,
  PerpsMarketListViewProps,
} from './PerpsMarketListView.types';

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

const PerpsMarketListView = ({ onMarketSelect }: PerpsMarketListViewProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'markets' | 'positions'>(
    'markets',
  );

  const navigation = useNavigation();

  const { markets, isLoading, error, refresh, isRefreshing } = usePerpsMarkets({
    enablePolling: false,
  });

  const {
    isConnected,
    isInitialized,
    error: connectionError,
  } = usePerpsConnection();

  // Debug logging
  useEffect(() => {
    DevLogger.log('PerpsMarketListView: Connection state', {
      isConnected,
      isInitialized,
      connectionError,
      marketsCount: markets.length,
      isLoading,
      error,
    });
  }, [
    isConnected,
    isInitialized,
    connectionError,
    markets.length,
    isLoading,
    error,
  ]);

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
    onMarketSelect?.(market);
  };

  const handleRefresh = () => {
    if (!isRefreshing) {
      refresh();
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

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const renderMarketList = () => {
    // Skeleton List
    if (filteredMarkets.length === 0 && isLoading) {
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
            estimatedItemSize={80}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        </Animated.View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text
            variant={TextVariant.HeadingMD}
            color={TextColor.Default}
            style={styles.headerTitle}
          >
            {strings('perps.perpetuals')}
          </Text>
          <TouchableOpacity style={styles.searchButton} onPress={handleClose}>
            <Icon name={IconName.Search} size={IconSize.Md} />
          </TouchableOpacity>
        </View>

        {/* Tab Buttons */}
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

        {/* Search Bar */}
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
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Icon name={IconName.Close} size={IconSize.Sm} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.listContainer}>{renderMarketList()}</View>
      </View>
    </SafeAreaView>
  );
};

export default PerpsMarketListView;
