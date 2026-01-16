import React, { useCallback } from 'react';
import { View } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import { FlatList } from 'react-native-gesture-handler';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type {
  PerpsMarketData,
  PerpsNavigationParamList,
  Position,
  Order,
} from '../../controllers/types';
import PerpsMarketRowItem from '../PerpsMarketRowItem';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PerpsWatchlistMarkets.styles';
import PerpsRowSkeleton from '../PerpsRowSkeleton';

interface PerpsWatchlistMarketsProps {
  markets: PerpsMarketData[];
  isLoading?: boolean;
  /** Positions from parent - avoids duplicate WebSocket subscriptions */
  positions?: Position[];
  /** Orders from parent - avoids duplicate WebSocket subscriptions */
  orders?: Order[];
}

const PerpsWatchlistMarkets: React.FC<PerpsWatchlistMarketsProps> = ({
  markets,
  isLoading,
  positions = [],
  orders = [],
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  const handleMarketPress = useCallback(
    (market: PerpsMarketData) => {
      // Check if user has a position or order for this market
      const hasPosition = positions.some((p) => p.coin === market.symbol);
      const hasOrder = orders.some((o) => o.symbol === market.symbol);

      // Determine which tab to open (same logic as PerpsCard)
      let initialTab: 'position' | 'orders' | undefined;
      if (hasPosition) {
        initialTab = 'position';
      } else if (hasOrder) {
        initialTab = 'orders';
      }
      // If no position or order, initialTab remains undefined and defaults to Overview

      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market,
          initialTab,
        },
      });
    },
    [navigation, positions, orders],
  );

  const renderMarket = useCallback(
    ({ item }: { item: PerpsMarketData }) => (
      <PerpsMarketRowItem
        market={item}
        showBadge={false}
        onPress={() => handleMarketPress(item)}
      />
    ),
    [handleMarketPress],
  );

  const handleViewAll = useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params: {},
    });
  }, [navigation]);

  // Header component - full row is pressable with chevron icon next to title
  const SectionHeader = useCallback(
    () => (
      <TouchableOpacity style={styles.header} onPress={handleViewAll}>
        <View style={styles.titleRow}>
          <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
            {strings('perps.home.watchlist')}
          </Text>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.Alternative}
          />
        </View>
      </TouchableOpacity>
    ),
    [styles.header, styles.titleRow, handleViewAll],
  );

  // Show skeleton during initial load
  if (isLoading) {
    return (
      <View style={styles.section}>
        <SectionHeader />
        <View style={styles.contentContainer}>
          <PerpsRowSkeleton count={3} />
        </View>
      </View>
    );
  }

  // Hide section entirely when no markets
  if (markets.length === 0) {
    return null;
  }

  // Render market list
  return (
    <View style={styles.section}>
      <SectionHeader />
      <View style={styles.contentContainer}>
        <FlatList
          data={markets}
          renderItem={renderMarket}
          keyExtractor={(item) => item.symbol}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </View>
  );
};

export default PerpsWatchlistMarkets;
