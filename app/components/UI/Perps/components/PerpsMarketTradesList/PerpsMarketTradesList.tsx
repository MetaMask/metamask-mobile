import React, { useCallback, useMemo } from 'react';
import { View, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  getPerpsDisplaySymbol,
  PERPS_CONSTANTS,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import type { PerpsTransaction } from '../../types/transactionHistory';
import PerpsTokenLogo from '../PerpsTokenLogo';
import PerpsFillTag from '../PerpsFillTag';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PerpsMarketTradesList.styles';
import PerpsRowSkeleton from '../PerpsRowSkeleton';
import { usePerpsMarketFills } from '../../hooks/usePerpsMarketFills';
import { transformFillsToTransactions } from '../../utils/transactionTransforms';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MonetizedPrimitive } from '../../../../../core/Analytics/MetaMetrics.types';
import {
  TRANSACTION_DETAIL_EVENTS,
  TransactionDetailLocation,
} from '../../../../../core/Analytics/events/transactions';
import { PERPS_BALANCE_CHAIN_ID } from '../../constants/perpsConfig';

interface PerpsMarketTradesListProps {
  symbol: string; // Market symbol to filter trades
  iconSize?: number;
}

const PerpsMarketTradesList: React.FC<PerpsMarketTradesListProps> = ({
  symbol,
  iconSize = 36,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();

  // Fetch order fills via WebSocket + REST API for complete history
  // WebSocket provides instant updates, REST provides complete historical data
  const { fills: marketFills, isInitialLoading: isLoading } =
    usePerpsMarketFills({
      symbol,
      throttleMs: 0, // Instant updates for real-time activity
    });

  // Transform fills to transactions and limit to 3
  // Note: marketFills is already filtered by symbol and sorted by the hook
  const trades = useMemo(() => {
    const transactions = transformFillsToTransactions(marketFills);
    return transactions.slice(0, PERPS_CONSTANTS.RecentActivityLimit);
  }, [marketFills]);

  const handleSeeAll = useCallback(() => {
    // Navigate to Activity > Trades tab
    navigation.navigate(Routes.PERPS.ACTIVITY, {
      redirectToPerpsTransactions: true,
      showBackButton: true,
    });
  }, [navigation]);

  const handleTradePress = useCallback(
    (transaction: PerpsTransaction) => {
      trackEvent(
        createEventBuilder(TRANSACTION_DETAIL_EVENTS.LIST_ITEM_CLICKED)
          .addProperties({
            transaction_type: `perps_${transaction.type}`,
            transaction_status: 'confirmed',
            location: TransactionDetailLocation.Home,
            chain_id_source: PERPS_BALANCE_CHAIN_ID,
            chain_id_destination: PERPS_BALANCE_CHAIN_ID,
            monetized_primitive: MonetizedPrimitive.Perps,
          })
          .build(),
      );

      // Navigate to the position transaction detail screen
      navigation.navigate(Routes.PERPS.POSITION_TRANSACTION, {
        transaction,
      });
    },
    [navigation, trackEvent, createEventBuilder],
  );

  // Render right content for trades
  const renderRightContent = useCallback((transaction: PerpsTransaction) => {
    if (!transaction.fill) return null;

    const pnlColor = transaction.fill.isPositive
      ? TextColor.SuccessDefault
      : TextColor.ErrorDefault;
    return (
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={pnlColor}
      >
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
              <View style={styles.tradeTitleRow}>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                  style={styles.tradeType}
                >
                  {item.title}
                </Text>
                <PerpsFillTag
                  transaction={item}
                  screenName={
                    PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_MARKET_DETAILS
                  }
                />
              </View>
              {!!item.subtitle && (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
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
      <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
        {strings('perps.market.recent_trades')}
      </Text>
      {!isLoading && (
        <TouchableOpacity
          testID="see-all-button"
          onPress={handleSeeAll}
          accessibilityRole="button"
          accessibilityLabel={strings('perps.home.see_all')}
        >
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Md}
            color={IconColor.IconAlternative}
          />
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
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
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
