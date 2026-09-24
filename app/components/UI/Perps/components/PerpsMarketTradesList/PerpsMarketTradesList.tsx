import React, { useCallback, useMemo, useState } from 'react';
import { View, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  SectionHeader,
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
  ACTIVITY_DETAIL_EVENTS,
  TransactionDetailLocation,
} from '../../../../../core/Analytics/events/transactions';
import {
  PERPS_BALANCE_CHAIN_ID,
  HOME_SCREEN_CONFIG,
} from '../../constants/perpsConfig';
import { navigateToPerpsTransactionDetails } from '../../utils/navigateToPerpsTransactionDetails';
import { PerpsMarketTradesListSelectorsIDs } from '../../Perps.testIds';
import { usePerpsNetwork } from '../../hooks/usePerpsNetwork';
import PerpsAggregatedFillsCheckbox from '../PerpsAggregatedFillsCheckbox';

interface PerpsMarketTradesListProps {
  symbol: string; // Market symbol to filter trades
  iconSize?: number;
}

const PerpsMarketTradesList: React.FC<PerpsMarketTradesListProps> = ({
  symbol,
  iconSize = HOME_SCREEN_CONFIG.DefaultIconSize,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<AppNavigationProp>();
  const isTestnet = usePerpsNetwork() === 'testnet';
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [aggregateFills, setAggregateFills] = useState(true);

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
    const transactions = transformFillsToTransactions(marketFills, {
      aggregate: aggregateFills,
    });
    return transactions.slice(0, PERPS_CONSTANTS.RecentActivityLimit);
  }, [marketFills, aggregateFills]);

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
        createEventBuilder(ACTIVITY_DETAIL_EVENTS.OPENED)
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

      navigateToPerpsTransactionDetails(navigation, transaction, isTestnet);
    },
    [navigation, isTestnet, trackEvent, createEventBuilder],
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

      return (
        <TouchableOpacity
          testID={PerpsMarketTradesListSelectorsIDs.ROW(index)}
          style={styles.tradeItem}
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
    [styles, handleTradePress, iconSize, renderRightContent],
  );

  const recentTradesTitle = strings('perps.market.recent_trades');

  const renderSectionHeader = (isInteractive: boolean) => (
    <Box flexDirection={BoxFlexDirection.Row} alignItems={BoxAlignItems.Center}>
      <Box twClassName="flex-1">
        {isInteractive ? (
          <SectionHeader
            title={recentTradesTitle}
            isInteractive
            onPress={handleSeeAll}
            testID="see-all-button"
          />
        ) : (
          <SectionHeader title={recentTradesTitle} />
        )}
      </Box>
      <Box twClassName="pr-4">
        <PerpsAggregatedFillsCheckbox
          isSelected={aggregateFills}
          onChange={setAggregateFills}
          testID="perps-market-trades-aggregated-checkbox"
        />
      </Box>
    </Box>
  );

  const renderContent = () => {
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
      <FlatList
        testID={PerpsMarketTradesListSelectorsIDs.LIST}
        data={trades}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.id || index}`}
        scrollEnabled={false}
      />
    );
  };

  if (isLoading) {
    return (
      <Box paddingBottom={3}>
        {renderSectionHeader(false)}
        <PerpsRowSkeleton count={3} />
      </Box>
    );
  }

  return (
    <Box paddingBottom={3}>
      {renderSectionHeader(true)}
      {renderContent()}
    </Box>
  );
};

export default PerpsMarketTradesList;
