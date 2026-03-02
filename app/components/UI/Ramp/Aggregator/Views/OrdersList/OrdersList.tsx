import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, TouchableHighlight } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';

import { createOrderDetailsNavDetails } from '../OrderDetails/OrderDetails';
import { createRampsOrderDetailsNavDetails } from '../../../Views/OrderDetails';
import { createDepositOrderDetailsNavDetails } from '../../../Deposit/Views/DepositOrderDetails/DepositOrderDetails';
import { useRampNavigation } from '../../../hooks/useRampNavigation';
import createStyles from './OrdersList.styles';
import {
  getOrderRowTestId,
  type RampsOrderTypeSlug,
} from './OrdersList.testIds';
import { TabEmptyState } from '../../../../../../component-library/components-temp/TabEmptyState';

import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../../constants/on-ramp';
import { getOrders } from '../../../../../../reducers/fiatOrders';
import { strings } from '../../../../../../../locales/i18n';

function getOrderTypeSlug(order: FiatOrder): RampsOrderTypeSlug {
  if (order.provider === FIAT_ORDER_PROVIDERS.DEPOSIT) {
    return 'deposit';
  }
  return order.orderType === OrderOrderTypeEnum.Buy ? 'buy' : 'sell';
}
import { useTheme } from '../../../../../../util/theme';
import ButtonFilter from '../../../../../../component-library/components-temp/ButtonFilter';
import {
  Box,
  ButtonSize as ButtonBaseSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useRampsOrders } from '../../../hooks/useRampsOrders';
import {
  mergeDisplayOrders,
  type DisplayOrder,
} from '../../../utils/displayOrder';
import { toDateFormat } from '../../../../../../util/date';
import { addCurrencySymbol, renderFiat } from '../../../../../../util/number';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import ListItem from '../../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import ListItemColumnEnd from '../../components/ListItemColumnEnd';

function getOrderTypeSlug(order: DisplayOrder): RampsOrderTypeSlug {
  if (order.orderType === 'DEPOSIT') {
    return 'deposit';
  }
  if (order.orderType === OrderOrderTypeEnum.Buy || order.orderType === 'BUY') {
    return 'buy';
  }
  return 'sell';
}

type filterType = 'ALL' | 'PURCHASE' | 'SELL';

function getStatusColorAndText(
  status: string,
  orderType: string,
): [TextColor, string] {
  let statusColor;
  switch (status) {
    case 'CANCELLED':
    case 'FAILED':
      statusColor = TextColor.Error;
      break;
    case 'COMPLETED':
      statusColor = TextColor.Success;
      break;
    case 'PENDING':
      statusColor = TextColor.Primary;
      break;
    case 'CREATED':
    default:
      statusColor = TextColor.Default;
      break;
  }

  let statusText;
  switch (status) {
    case 'CANCELLED':
      statusText = strings('fiat_on_ramp_aggregator.order_status_cancelled');
      break;
    case 'FAILED':
      statusText = strings('fiat_on_ramp_aggregator.order_status_failed');
      break;
    case 'COMPLETED':
      statusText = strings('fiat_on_ramp_aggregator.order_status_completed');
      break;
    case 'PENDING':
      statusText =
        orderType === 'BUY'
          ? strings('fiat_on_ramp_aggregator.order_status_pending')
          : strings('fiat_on_ramp_aggregator.order_status_processing');
      break;
    case 'CREATED':
    default:
      statusText = strings('fiat_on_ramp_aggregator.order_status_pending');
      break;
  }

  return [statusColor, statusText];
}

function DisplayOrderListItem({ item }: { item: DisplayOrder }) {
  const isBuy = item.orderType === 'BUY' || item.orderType === 'DEPOSIT';
  const [statusColor, statusText] = getStatusColorAndText(
    item.status,
    item.orderType,
  );

  const title = item.providerName
    ? `${item.providerName}: ${strings(
        isBuy
          ? 'fiat_on_ramp_aggregator.purchased_currency'
          : 'fiat_on_ramp_aggregator.sold_currency',
        { currency: item.cryptoCurrencySymbol },
      )}`
    : strings(
        isBuy
          ? 'fiat_on_ramp_aggregator.purchased_currency'
          : 'fiat_on_ramp_aggregator.sold_currency',
        { currency: item.cryptoCurrencySymbol },
      );

  return (
    <ListItem
      topAccessory={
        <Text variant={TextVariant.BodySM}>{toDateFormat(item.createdAt)}</Text>
      }
      topAccessoryGap={10}
    >
      <ListItemColumn widthType={WidthType.Fill}>
        <Text variant={TextVariant.BodyMD}>{title}</Text>
        <Text variant={TextVariant.BodySMBold} color={statusColor}>
          {statusText}
        </Text>
      </ListItemColumn>

      <ListItemColumnEnd>
        <Text variant={TextVariant.BodyMD}>
          {item.cryptoAmount} {item.cryptoCurrencySymbol}
        </Text>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {item.fiatAmount == null
            ? '...'
            : addCurrencySymbol(
                renderFiat(Number(item.fiatAmount), ''),
                item.fiatCurrencyCode,
              )}
        </Text>
      </ListItemColumnEnd>
    </ListItem>
  );
}

/**
 * Merges legacy FiatOrder[] from Redux with V2 RampsOrder[] from controller into a single list
 * Routes to the appropriate detail screen based on order source.
 */
function OrdersList() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const allLegacyOrders = useSelector(getOrders);
  const { orders: v2Orders } = useRampsOrders();
  const [currentFilter, setCurrentFilter] = useState<filterType>('ALL');
  const { goToDeposit } = useRampNavigation();
  const tw = useTailwind();

  const displayOrders = useMemo(
    () => mergeDisplayOrders(allLegacyOrders, v2Orders),
    [allLegacyOrders, v2Orders],
  );

  const filteredOrders = useMemo(
    () =>
      displayOrders.filter((order) => {
        if (currentFilter === 'PURCHASE') {
          return (
            order.orderType === OrderOrderTypeEnum.Buy ||
            order.orderType === 'DEPOSIT' ||
            order.orderType === 'BUY'
          );
        }
        if (currentFilter === 'SELL') {
          return order.orderType === OrderOrderTypeEnum.Sell;
        }
        return true;
      }),
    [displayOrders, currentFilter],
  );

  const handleNavigateToAggregatorTxDetails = useCallback(
    (orderId: string) => {
      navigation.navigate(
        ...createOrderDetailsNavDetails({
          orderId,
        }),
      );
    },
    [navigation],
  );

  const handleNavigateToRampsTxDetails = useCallback(
    (orderId: string) => {
      navigation.navigate(
        ...createRampsOrderDetailsNavDetails({
          orderId,
        }),
      );
    },
    [navigation],
  );

  const handleNavigateToDepositTxDetails = useCallback(
    (orderId: string) => {
      const order = allLegacyOrders.find((o) => o.id === orderId);

      if (
        order?.state === FIAT_ORDER_STATES.CREATED &&
        order?.provider === FIAT_ORDER_PROVIDERS.DEPOSIT
      ) {
        goToDeposit();
      } else if (order?.provider === FIAT_ORDER_PROVIDERS.DEPOSIT) {
        navigation.navigate(
          ...createDepositOrderDetailsNavDetails({
            orderId,
          }),
        );
      } else {
        handleNavigateToAggregatorTxDetails(orderId);
      }
    },
    [
      allLegacyOrders,
      goToDeposit,
      handleNavigateToAggregatorTxDetails,
      navigation,
    ],
  );

  const renderItem = ({ item, index }: { item: FiatOrder; index: number }) => {
    const rowIndex = index + 1;
    const orderType = getOrderTypeSlug(item);
    return (
      <TouchableHighlight
        testID={getOrderRowTestId(orderType, rowIndex)}
        accessibilityRole="button"
        accessible
        style={styles.row}
        onPress={
          item.provider === FIAT_ORDER_PROVIDERS.AGGREGATOR
            ? () => handleNavigateToAggregatorTxDetails(item.id)
            : item.provider === FIAT_ORDER_PROVIDERS.RAMPS_V2
              ? () => handleNavigateToRampsTxDetails(item.id)
              : item.provider === FIAT_ORDER_PROVIDERS.DEPOSIT
                ? () => handleNavigateToDepositTxDetails(item.id)
                : undefined
        }
        underlayColor={colors.background.alternative}
        activeOpacity={1}
      >
        <OrderListItem
          order={item}
          rowIndex={rowIndex}
          orderTypeSlug={orderType}
        />
      </TouchableHighlight>
    );
  };

  return (
    <FlatList
      ListHeaderComponent={
        <Box twClassName="px-4 py-2 bg-default">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw.style('flex-row gap-3')}
          >
            <ButtonFilter
              onPress={() => setCurrentFilter('ALL')}
              isActive={currentFilter === 'ALL'}
              size={ButtonBaseSize.Md}
              accessibilityLabel={strings('fiat_on_ramp_aggregator.All')}
            >
              {strings('fiat_on_ramp_aggregator.All')}
            </ButtonFilter>
            <ButtonFilter
              onPress={() => setCurrentFilter('PURCHASE')}
              isActive={currentFilter === 'PURCHASE'}
              size={ButtonBaseSize.Md}
              accessibilityLabel={strings('fiat_on_ramp_aggregator.Purchased')}
            >
              {strings('fiat_on_ramp_aggregator.Purchased')}
            </ButtonFilter>
            <ButtonFilter
              onPress={() => setCurrentFilter('SELL')}
              isActive={currentFilter === 'SELL'}
              size={ButtonBaseSize.Md}
              accessibilityLabel={strings('fiat_on_ramp_aggregator.Sold')}
            >
              {strings('fiat_on_ramp_aggregator.Sold')}
            </ButtonFilter>
          </ScrollView>
        </Box>
      }
      data={filteredOrders}
      renderItem={renderItem}
      keyExtractor={(item) => `${item.source}-${item.id}`}
      ListEmptyComponent={
        <Box twClassName="w-full items-center py-10">
          <TabEmptyState
            description={
              currentFilter === 'ALL'
                ? strings('fiat_on_ramp_aggregator.empty_orders_list')
                : currentFilter === 'PURCHASE'
                  ? strings('fiat_on_ramp_aggregator.empty_buy_orders_list')
                  : strings('fiat_on_ramp_aggregator.empty_sell_orders_list')
            }
          />
        </Box>
      }
    />
  );
}

export default OrdersList;
