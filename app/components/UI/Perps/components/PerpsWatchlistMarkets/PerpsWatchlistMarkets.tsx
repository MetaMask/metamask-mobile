import React, { useCallback } from 'react';
import { FlatList, View, type StyleProp, type ViewStyle } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
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
  /** Override section styles (e.g., to adjust margins) */
  sectionStyle?: StyleProp<ViewStyle>;
  /** Override header styles (e.g., to remove horizontal padding) */
  headerStyle?: StyleProp<ViewStyle>;
  /** Override content container styles (e.g., to remove horizontal margin) */
  contentContainerStyle?: StyleProp<ViewStyle>;
}

const PerpsWatchlistMarkets: React.FC<PerpsWatchlistMarketsProps> = ({
  markets,
  isLoading,
  positions = [],
  orders = [],
  sectionStyle,
  headerStyle,
  contentContainerStyle,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  const handleMarketPress = useCallback(
    (market: PerpsMarketData) => {
      // Check if user has a position or order for this market
      const hasPosition = positions.some((p) => p.symbol === market.symbol);
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

  // Header component
  const SectionHeader = useCallback(
    () => (
      <View style={[styles.header, headerStyle]}>
        <Text variant={TextVariant.BodyLGMedium} color={TextColor.Default}>
          {strings('perps.home.watchlist')}
        </Text>
      </View>
    ),
    [styles.header, headerStyle],
  );

  // Show skeleton during initial load
  if (isLoading) {
    return (
      <View style={[styles.section, sectionStyle]}>
        <SectionHeader />
        <View style={[styles.contentContainer, contentContainerStyle]}>
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
    <View style={[styles.section, sectionStyle]}>
      <SectionHeader />
      <View style={[styles.contentContainer, contentContainerStyle]}>
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
