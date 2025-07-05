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
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import PerpsMarketRowItem from '../../components/PerpsMarketRowItem';
import {
  PerpsMarketListViewProps,
  PerpsMarketData,
} from './PerpsMarketListView.types';
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
import styleSheet from './PerpsMarketListView.styles';
import { useNavigation } from '@react-navigation/native';

const PerpsMarketListView = ({ onMarketSelect }: PerpsMarketListViewProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const [searchQuery, setSearchQuery] = useState('');

  const navigation = useNavigation();

  const { markets, isLoading, error, refresh, isRefreshing } = usePerpsMarkets({
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
    onMarketSelect?.(market);
  };

  const handleRefresh = () => {
    if (!isRefreshing) {
      refresh();
    }
  };

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const filteredMarkets = useMemo(() => {
    if (!searchQuery.trim()) {
      return markets;
    }
    const query = searchQuery.toLowerCase().trim();
    return markets.filter(
      (market) =>
        market.symbol.toLowerCase().includes(query) ||
        market.name.toLowerCase().includes(query),
    );
  }, [markets, searchQuery]);

  const renderListHeader = () => (
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

  const renderSkeletonItem = () => (
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

  const renderSkeletonList = () => (
    <View>
      {renderListHeader()}
      {Array.from({ length: 8 }).map((_, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <View key={index}>{renderSkeletonItem()}</View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Default}
            style={styles.headerTitle}
          >
            {strings('perps.perpetual_markets')}
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Icon name={IconName.Close} size={IconSize.Md} />
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

        {/* Market List */}
        <View style={styles.listContainer}>
          {filteredMarkets.length === 0 && isLoading ? (
            renderSkeletonList()
          ) : error && filteredMarkets.length === 0 ? (
            <View style={styles.errorContainer}>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Error}
                style={styles.errorText}
              >
                {strings('perps.failed_to_load_market_data')}
              </Text>
              <TouchableOpacity onPress={handleRefresh}>
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Primary}
                >
                  {strings('perps.tap_to_retry')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {renderListHeader()}
              <Animated.View
                style={[
                  styles.animatedListContainer,
                  { opacity: fadeAnimation },
                ]}
              >
                <FlashList
                  style={styles.animatedListContainer}
                  data={filteredMarkets}
                  renderItem={({ item }) => (
                    <PerpsMarketRowItem
                      market={item}
                      onPress={handleMarketPress}
                    />
                  )}
                  keyExtractor={(item) => item.symbol}
                  contentContainerStyle={styles.flashListContent}
                  estimatedItemSize={80}
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                />
              </Animated.View>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PerpsMarketListView;
