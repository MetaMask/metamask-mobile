import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SectionHeader, Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import type { OrderItem } from '../../../../util/orders/types';
import { useOrdersStore } from '../../../../util/orders/ordersStore';
import { OrderListItemRow } from '../../Orders/OrderListItemRow/OrderListItemRow';
import SectionRow from '../../../Views/Homepage/components/SectionRow';

interface TokenDetailsOpenOrdersCardProps {
  tokenSymbol?: string;
  testID?: string;
}

export const TokenDetailsOpenOrdersCard: React.FC<
  TokenDetailsOpenOrdersCardProps
> = ({ tokenSymbol, testID }) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { orders } = useOrdersStore({ tokenSymbol });

  const openOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === 'open' || order.status === 'partiallyFilled',
      ),
    [orders],
  );

  const handleOrderPress = useCallback(
    (order: OrderItem) => {
      navigation.navigate(Routes.ORDER_DETAILS_VIEW, {
        orderId: order.id,
        order,
      });
    },
    [navigation],
  );

  if (openOrders.length === 0) {
    return null;
  }

  return (
    <View
      style={tw.style('w-full my-2')}
      testID={testID ?? 'token-details-open-orders-section'}
    >
      <SectionHeader
        title="Open Orders"
        testID="token-details-open-orders-header"
      />
      <SectionRow gap={1}>
        <Box gap={1}>
          {openOrders.map((order) => (
            <OrderListItemRow
              key={order.id}
              order={order}
              onPress={handleOrderPress}
            />
          ))}
        </Box>
      </SectionRow>
    </View>
  );
};

export default TokenDetailsOpenOrdersCard;
