import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { OrderItem } from '../../../../util/orders/types';
import {
  formatOrderTimestamp,
  formatDomainName,
} from '../../../../util/orders/orderHelpers';

interface OrderListItemRowProps {
  order: OrderItem;
  onPress?: (order: OrderItem) => void;
  testID?: string;
}

export const OrderListItemRow: React.FC<OrderListItemRowProps> = ({
  order,
  onPress,
  testID,
}) => {
  const tw = useTailwind();

  const isBuySide =
    order.side === 'buy' || order.side === 'long' || order.side === 'yes';

  const sideBgColor = isBuySide ? 'bg-success-muted' : 'bg-error-muted';
  const sideTextColor = isBuySide
    ? TextColor.SuccessDefault
    : TextColor.ErrorDefault;

  const handlePress = () => {
    onPress?.(order);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      testID={testID ?? `order-row-${order.id}`}
      style={tw.style(
        'p-3 my-1 rounded-xl bg-default border border-muted flex-col gap-2',
      )}
    >
      {/* Top Header: Instrument, Domain Tag, Side & Type */}
      <View style={tw.style('flex-row items-center justify-between')}>
        <View style={tw.style('flex-row items-center gap-2')}>
          <Text variant={TextVariant.BodyMdBold} color={TextColor.TextDefault}>
            {order.instrument.symbol}
          </Text>
          <View style={tw.style(`px-2 py-0.5 rounded-full ${sideBgColor}`)}>
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Bold}
              color={sideTextColor}
            >
              {order.side.toUpperCase()} {order.orderType.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={tw.style('px-2 py-0.5 rounded-md bg-muted')}>
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            fontWeight={FontWeight.Medium}
          >
            {formatDomainName(order.domain)}
          </Text>
        </View>
      </View>

      {/* Middle Row: Price and Size Metrics */}
      <View style={tw.style('flex-row items-center justify-between')}>
        <Box>
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            Target / Limit
          </Text>
          <Text
            variant={TextVariant.BodySmMedium}
            color={TextColor.TextDefault}
          >
            {order.formattedPrice ?? order.price ?? 'Market'}
          </Text>
        </Box>

        <Box style={tw.style('items-end')}>
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            Size
          </Text>
          <Text
            variant={TextVariant.BodySmMedium}
            color={TextColor.TextDefault}
          >
            {order.formattedSize}
          </Text>
        </Box>
      </View>

      {/* Optional Partial Fill Progress */}
      {order.status === 'partiallyFilled' &&
        order.fillPercentage !== undefined && (
          <View style={tw.style('w-full mt-1.5')}>
            <View style={tw.style('flex-row justify-between mb-1')}>
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.WarningDefault}
                fontWeight={FontWeight.Medium}
              >
                Filled: {order.filledSize} ({order.fillPercentage}%)
              </Text>
            </View>
            <View
              style={tw.style(
                'w-full h-2 rounded-full bg-muted overflow-hidden',
              )}
            >
              <View
                style={[
                  tw.style('h-full bg-warning-default rounded-full min-w-2'),
                  { width: `${order.fillPercentage}%` },
                ]}
              />
            </View>
          </View>
        )}

      {/* Bottom Footer: Timestamp & USD Value */}
      <View
        style={tw.style(
          'flex-row items-center justify-between pt-1 border-t border-muted',
        )}
      >
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {formatOrderTimestamp(order.timestamp)}
        </Text>
        {order.notionalValueUsd ? (
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            Est. {order.notionalValueUsd}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};
