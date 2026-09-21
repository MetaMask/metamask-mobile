import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import type { OrderDomain, OrderItem } from '../../../../util/orders/types';
import { useOrdersStore } from '../../../../util/orders/ordersStore';
import { OrderListItemRow } from '../OrderListItemRow/OrderListItemRow';
import { CreateSampleLimitOrderModal } from '../CreateSampleLimitOrderModal/CreateSampleLimitOrderModal';
import { formatDomainName } from '../../../../util/orders/orderHelpers';

interface FeatureOpenOrdersSectionProps {
  domain: OrderDomain;
  title?: string;
  testID?: string;
}

export const FeatureOpenOrdersSection: React.FC<
  FeatureOpenOrdersSectionProps
> = ({ domain, title, testID }) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { orders } = useOrdersStore({ domain });
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  const handleOrderPress = useCallback(
    (order: OrderItem) => {
      navigation.navigate(Routes.ORDER_DETAILS_VIEW, {
        orderId: order.id,
        order,
      });
    },
    [navigation],
  );

  return (
    <View
      style={tw.style('w-full my-2')}
      testID={testID ?? `feature-open-orders-${domain}`}
    >
      <View style={tw.style('flex-row items-center justify-between px-4 mb-2')}>
        <View style={tw.style('flex-row items-center gap-2')}>
          <Text variant={TextVariant.HeadingSm} color={TextColor.TextDefault}>
            {title ?? `${formatDomainName(domain)} Orders`}
          </Text>
          <View style={tw.style('px-2 py-0.5 rounded-full bg-primary-muted')}>
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Bold}
              color={TextColor.PrimaryDefault}
            >
              {orders.length} Open
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setIsCreateModalVisible(true)}
          style={tw.style(
            'px-2.5 py-1 rounded-lg bg-default border border-muted',
          )}
        >
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Bold}
            color={TextColor.PrimaryDefault}
          >
            + Place Order
          </Text>
        </TouchableOpacity>
      </View>

      {orders.length === 0 ? (
        <View style={tw.style('px-4 py-6 items-center')}>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            No open {formatDomainName(domain).toLowerCase()} orders.
          </Text>
        </View>
      ) : (
        <View style={tw.style('px-4 gap-1')}>
          {orders.map((order) => (
            <OrderListItemRow
              key={order.id}
              order={order}
              onPress={handleOrderPress}
            />
          ))}
        </View>
      )}

      {/* Create Sample Limit Order Modal */}
      <CreateSampleLimitOrderModal
        isVisible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
      />
    </View>
  );
};

export default FeatureOpenOrdersSection;
