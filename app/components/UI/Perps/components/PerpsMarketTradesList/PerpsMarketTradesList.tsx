import React, { useCallback, useMemo } from 'react';
import { View, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { PerpsNavigationParamList } from '../../controllers/types';
import type { PerpsTransaction } from '../../types/transactionHistory';
import PerpsTokenLogo from '../PerpsTokenLogo';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PerpsMarketTradesList.styles';
import PerpsRowSkeleton from '../PerpsRowSkeleton';
import { getPerpsDisplaySymbol } from '../../utils/marketUtils';
import { usePerpsLiveFills } from '../../hooks/stream';
import { transformFillsToTransactions } from '../../utils/transactionTransforms';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';

interface PerpsMarketTradesListProps {
  symbol: string; // Market symbol to filter trades
  iconSize?: number;
}

const PerpsMarketTradesList: React.FC<PerpsMarketTradesListProps> = ({
  symbol,
  iconSize = 36,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  // Fetch all order fills via WebSocket for live updates
  const { fills: orderFills, isInitialLoading: isLoading } = usePerpsLiveFills({
    throttleMs: 0, // Instant updates for real-time activity
  });

  // Filter by symbol, transform, and limit to 3
  const trades = useMemo(() => {
    // Filter fills for this market
    const marketFills = orderFills.filter((fill) => fill.symbol === symbol);

    // Sort by timestamp descending (newest first)
    marketFills.sort((a, b) => b.timestamp - a.timestamp);

    // Transform to transactions
    const transactions = transformFillsToTransactions(marketFills);

    // Limit to 3
    return transactions.slice(0, PERPS_CONSTANTS.RECENT_ACTIVITY_LIMIT);
  }, [orderFills, symbol]);

  const handleSeeAll = useCallback(() => {
    // Navigate to Activity > Trades tab
    navigation.navigate(Routes.PERPS.ACTIVITY, {
      redirectToPerpsTransactions: true,
      showBackButton: true,
    });
  }, [navigation]);

  const handleTradePress = useCallback(
    (transaction: PerpsTransaction) => {
      // Navigate to the position transaction detail screen
      navigation.navigate(Routes.PERPS.POSITION_TRANSACTION, {
        transaction,
      });
    },
    [navigation],
  );

  // Render right content for trades
  const renderRightContent = useCallback((transaction: PerpsTransaction) => {
    if (!transaction.fill) return null;

    const pnlColor = transaction.fill.isPositive
      ? TextColor.Success
      : TextColor.Error;
    return (
      <Text variant={TextVariant.BodyMDMedium} color={pnlColor}>
        {transaction.fill.amount}
      </Text>
    );
  }, []);

  const renderItem = useCallback(
    (props: { item: PerpsTransaction; index: number }) => {
      const { item, index } = props;
      const isFirstItem = index === 0;
      const isLastItem = index === trades.length - 1;

      return (
        <TouchableOpacity
          style={[
            styles.tradeItem,
            isFirstItem && styles.tradeItemFirst,
            isLastItem && styles.tradeItemLast,
          ]}
          onPress={() => handleTradePress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.leftSection}>
            <View style={styles.iconContainer}>
              <PerpsTokenLogo
                symbol={item.asset}
                size={iconSize}
                recyclingKey={`${item.asset}-${item.id}`}
              />
            </View>
            <View style={styles.tradeInfo}>
              <Text
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Default}
                style={styles.tradeType}
              >
                {item.title}
              </Text>
              {!!item.subtitle && (
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {getPerpsDisplaySymbol(item.subtitle)}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.rightSection}>{renderRightContent(item)}</View>
        </TouchableOpacity>
      );
    },
    [styles, handleTradePress, iconSize, renderRightContent, trades.length],
  );

  // Render header section
  const renderHeader = () => (
    <View style={styles.header}>
      <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
        {strings('perps.market.recent_trades')}
      </Text>
      {!isLoading && trades.length > 0 && (
        <TouchableOpacity onPress={handleSeeAll}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('perps.home.see_all')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render content based on state
  const renderContent = () => {
    if (isLoading) {
      return <PerpsRowSkeleton count={3} />;
    }

    if (trades.length === 0) {
      return (
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Alternative}
          style={styles.emptyText}
        >
          {strings('perps.market.no_trades')}
        </Text>
      );
    }

    return (
      <View style={styles.listContainer}>
        <FlatList
          data={trades}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id || index}`}
          scrollEnabled={false}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderContent()}
    </View>
  );
};

export default PerpsMarketTradesList;
