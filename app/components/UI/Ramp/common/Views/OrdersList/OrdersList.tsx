import React, { useCallback, useState } from 'react';
import { FlatList, TouchableHighlight } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { createOrderDetailsNavDetails } from '../OrderDetails';
import OrderListItem from '../../components/OrderListItem';
import Row from '../../components/Row';
import createStyles from './OrdersList.styles';

import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import { ButtonProps } from '../../../../../../component-library/components/Buttons/Button/Button.types';

import { FIAT_ORDER_PROVIDERS } from '../../../../../../constants/on-ramp';
import { FiatOrder, getOrders } from '../../../../../../reducers/fiatOrders';
import { useTheme } from '../../../../../../util/theme';

type filterType = 'ALL' | 'BUY' | 'SELL';

interface FilterButtonProps extends Omit<ButtonProps, 'variant' | 'size'> {
  selected?: boolean;
}

function FilterButton({ selected = false, ...props }: FilterButtonProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <Button
      variant={selected ? ButtonVariants.Primary : ButtonVariants.Secondary}
      style={selected ? styles.selectedFilter : undefined}
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
  const orders = allOrders.filter(
    (order) => currentFilter === 'ALL' || order.orderType === currentFilter,
  );

  const handleNavigateToTxDetails = useCallback(
    (orderId) => {
      navigation.navigate(
        ...createOrderDetailsNavDetails({
          orderId,
        }),
      );
    },
    [navigation],
  );

  const renderItem = ({ item }: { item: FiatOrder }) => (
    <TouchableHighlight
      accessibilityRole="button"
      accessible
      style={styles.row}
      onPress={
        item.provider === FIAT_ORDER_PROVIDERS.AGGREGATOR
          ? () => handleNavigateToTxDetails(item.id)
          : undefined
      }
      underlayColor={colors.background.alternative}
      activeOpacity={1}
    >
      <OrderListItem order={item} />
    </TouchableHighlight>
  );

  return (
    <>
      <FlatList
        ListHeaderComponent={
          <ScrollView horizontal>
            <Row style={styles.filters}>
              <FilterButton
                label="All"
                onPress={() => setCurrentFilter('ALL')}
                selected={currentFilter === 'ALL'}
              />
              <FilterButton
                label="Buy"
                onPress={() => setCurrentFilter('BUY')}
                selected={currentFilter === 'BUY'}
              />
              <FilterButton
                label="Sell"
                onPress={() => setCurrentFilter('SELL')}
                selected={currentFilter === 'SELL'}
              />
            </Row>
          </ScrollView>
        }
        data={orders}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </>
  );
}

export default OrdersList;
