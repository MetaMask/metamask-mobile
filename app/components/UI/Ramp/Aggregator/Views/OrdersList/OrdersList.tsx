import React, { useCallback, useState } from 'react';
import { FlatList, TouchableHighlight } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';

import { createOrderDetailsNavDetails } from '../OrderDetails/OrderDetails';
import OrderListItem from '../../components/OrderListItem';
import Row from '../../components/Row';
import createStyles from './OrdersList.styles';

import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import { ButtonProps } from '../../../../../../component-library/components/Buttons/Button/Button.types';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';

import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../../constants/on-ramp';
import { FiatOrder, getOrders } from '../../../../../../reducers/fiatOrders';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import { createDepositOrderDetailsNavDetails } from '../../../Deposit/Views/DepositOrderDetails/DepositOrderDetails';
import Routes from '../../../../../../constants/navigation/Routes';

type filterType = 'ALL' | 'PURCHASE' | 'SELL';

interface FilterButtonProps extends Omit<ButtonProps, 'variant' | 'size'> {
  readonly selected?: boolean;
}

function FilterButton({ selected = false, ...props }: FilterButtonProps) {
  return (
    <Button
      variant={selected ? ButtonVariants.Primary : ButtonVariants.Secondary}
      size={ButtonSize.Sm}
      accessibilityRole="button"
      accessible
      {...props}
    />
  );
}

function OrdersList() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const allOrders = useSelector(getOrders);
  const [currentFilter, setCurrentFilter] = useState<filterType>('ALL');
  const orders = allOrders.filter((order) => {
    if (currentFilter === 'PURCHASE') {
      return (
        order.orderType === OrderOrderTypeEnum.Buy ||
        order.orderType === 'DEPOSIT'
      );
    }
    if (currentFilter === 'SELL') {
      return order.orderType === OrderOrderTypeEnum.Sell;
    }
    return true;
  });

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

  const handleNavigateToDepositTxDetails = useCallback(
    (orderId: string) => {
      const order = orders.find((o) => o.id === orderId);

      if (order?.state === FIAT_ORDER_STATES.CREATED) {
        navigation.navigate(Routes.DEPOSIT.ID, {
          screen: Routes.DEPOSIT.ROOT,
        });
      } else {
        navigation.navigate(
          ...createDepositOrderDetailsNavDetails({
            orderId,
          }),
        );
      }
    },
    [navigation, orders],
  );

  const renderItem = ({ item }: { item: FiatOrder }) => (
    <TouchableHighlight
      accessibilityRole="button"
      accessible
      style={styles.row}
      onPress={
        item.provider === FIAT_ORDER_PROVIDERS.AGGREGATOR
          ? () => handleNavigateToAggregatorTxDetails(item.id)
          : item.provider === FIAT_ORDER_PROVIDERS.DEPOSIT
          ? () => handleNavigateToDepositTxDetails(item.id)
          : undefined
      }
      underlayColor={colors.background.alternative}
      activeOpacity={1}
    >
      <OrderListItem order={item} />
    </TouchableHighlight>
  );

  return (
    <FlatList
      ListHeaderComponent={
        <ScrollView horizontal>
          <Row style={styles.filters}>
            <FilterButton
              label={strings('fiat_on_ramp_aggregator.All')}
              onPress={() => setCurrentFilter('ALL')}
              selected={currentFilter === 'ALL'}
            />
            <FilterButton
              label={strings('fiat_on_ramp_aggregator.Purchased')}
              onPress={() => setCurrentFilter('PURCHASE')}
              selected={currentFilter === 'PURCHASE'}
            />
            <FilterButton
              label={strings('fiat_on_ramp_aggregator.Sold')}
              onPress={() => setCurrentFilter('SELL')}
              selected={currentFilter === 'SELL'}
            />
          </Row>
        </ScrollView>
      }
      data={orders}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <Row>
          <Text
            variant={TextVariant.HeadingMD}
            color={TextColor.Muted}
            style={styles.emptyMessage}
          >
            {currentFilter === 'ALL'
              ? strings('fiat_on_ramp_aggregator.empty_orders_list')
              : null}
            {currentFilter === 'PURCHASE'
              ? strings('fiat_on_ramp_aggregator.empty_buy_orders_list')
              : null}
            {currentFilter === 'SELL'
              ? strings('fiat_on_ramp_aggregator.empty_sell_orders_list')
              : null}
          </Text>
        </Row>
      }
    />
  );
}

export default OrdersList;
