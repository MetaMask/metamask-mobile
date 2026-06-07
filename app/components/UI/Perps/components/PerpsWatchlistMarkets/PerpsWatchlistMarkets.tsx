import React, { useCallback } from 'react';
import { FlatList, type StyleProp, type ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  type PerpsMarketData,
  type Position,
  type Order,
} from '@metamask/perps-controller';
import PerpsMarketRowItem from '../PerpsMarketRowItem';
import PerpsRowSkeleton from '../PerpsRowSkeleton';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

interface PerpsWatchlistMarketsProps {
  markets: PerpsMarketData[];
  isLoading?: boolean;
  /** Positions from parent - avoids duplicate WebSocket subscriptions */
  positions?: Position[];
  /** Orders from parent - avoids duplicate WebSocket subscriptions */
  orders?: Order[];
  /** Analytics source identifying the parent screen (e.g., 'perps_home') */
  source?: string;
  /** Bound onto market-details routes for downstream transaction attribution. */
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
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
  source,
  transactionActiveAbTests,
  sectionStyle,
  contentContainerStyle,
}) => {
  const navigation = useNavigation();

  const handleMarketPress = useCallback(
    (market: PerpsMarketData) => {
      const hasPosition = positions.some((p) => p.symbol === market.symbol);
      const hasOrder = orders.some((o) => o.symbol === market.symbol);

      let initialTab: 'position' | 'orders' | undefined;
      if (hasPosition) {
        initialTab = 'position';
      } else if (hasOrder) {
        initialTab = 'orders';
      }

      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market,
          initialTab,
          source,
          ...(transactionActiveAbTests?.length
            ? { transactionActiveAbTests }
            : {}),
        },
      });
    },
    [navigation, positions, orders, source, transactionActiveAbTests],
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

  if (!isLoading && markets.length === 0) {
    return null;
  }

  return (
    <Box style={sectionStyle}>
      <SectionDivider />
      <SectionHeader title={strings('perps.home.watchlist')} />
      <Box paddingHorizontal={4} style={contentContainerStyle}>
        {isLoading ? (
          <PerpsRowSkeleton count={3} />
        ) : (
          <FlatList
            data={markets}
            renderItem={renderMarket}
            keyExtractor={(item) => item.symbol}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          />
        )}
      </Box>
    </Box>
  );
};

export default PerpsWatchlistMarkets;
