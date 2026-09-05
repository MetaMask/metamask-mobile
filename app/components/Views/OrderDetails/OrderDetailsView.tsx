import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  HeaderStandard,
  Button,
  ButtonVariant,
  ButtonSize,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import type { OrderItem } from '../../../util/orders/types';
import { useOrdersStore } from '../../../util/orders/ordersStore';
import {
  formatOrderTimestamp,
  formatDomainName,
  resolveOrderDetailRows,
} from '../../../util/orders/orderHelpers';

export interface OrderDetailsRouteParams {
  orderId?: string;
  order?: OrderItem;
}

export const OrderDetailsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<{ params: OrderDetailsRouteParams }, 'params'>>();
  const { orderId, order: initialOrder } = route.params ?? {};

  const { orders, cancelOrder } = useOrdersStore();
  const [isCanceling, setIsCanceling] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const order = useMemo(() => {
    if (orderId) {
      const found = orders.find((o) => o.id === orderId);
      if (found) return found;
    }
    return initialOrder;
  }, [orderId, initialOrder, orders]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCopyOrderId = useCallback(() => {
    if (order?.id) {
      Clipboard.setString(order.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  }, [order?.id]);

  const handleCancel = useCallback(() => {
    if (!order) return;

    const confirmMessage =
      order.cancelType === 'onChain'
        ? `Cancelling this order on ${
            order.instrument.networkName ?? 'network'
          } requires an on-chain transaction with gas fees (~${
            order.estimatedCancelFeeUsd ?? '$0.50'
          }). Proceed?`
        : 'Are you sure you want to cancel this order? This action cannot be undone.';

    Alert.alert('Cancel Order', confirmMessage, [
      { text: 'Keep Order', style: 'cancel' },
      {
        text: 'Cancel Order',
        style: 'destructive',
        onPress: () => {
          setIsCanceling(true);
          setTimeout(() => {
            setIsCanceling(false);
            cancelOrder(order.id);
            Alert.alert(
              'Order Cancelled',
              `Your ${order.instrument.symbol} order has been successfully cancelled.`,
              [{ text: 'OK', onPress: () => navigation.goBack() }],
            );
          }, 600);
        },
      },
    ]);
  }, [order, cancelOrder, navigation]);

  const isBuySide =
    order?.side === 'buy' || order?.side === 'long' || order?.side === 'yes';
  const sideBgColor = isBuySide ? 'bg-success-muted' : 'bg-error-muted';
  const sideTextColor = isBuySide
    ? TextColor.SuccessDefault
    : TextColor.ErrorDefault;

  const detailRows = useMemo(
    () => (order ? resolveOrderDetailRows(order) : []),
    [order],
  );

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID="order-details-screen"
    >
      <HeaderStandard
        title="Order Details"
        onBack={handleBack}
        includesTopInset
        backButtonProps={{
          testID: 'order-details-back-button',
        }}
      />

      {order ? (
        <ScrollView
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('grow p-4 gap-4 pb-12')}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Header Section */}
          <View
            style={tw.style(
              'items-center p-6 rounded-2xl bg-muted border border-muted gap-3',
            )}
            testID="order-details-hero"
          >
            <View
              style={tw.style(
                'w-16 h-16 rounded-full bg-default items-center justify-center border border-muted shadow-sm',
              )}
            >
              <Text
                variant={TextVariant.HeadingLg}
                fontWeight={FontWeight.Bold}
                color={TextColor.TextDefault}
              >
                {order.instrument.baseAssetSymbol?.slice(0, 3) ??
                  order.instrument.symbol.slice(0, 3)}
              </Text>
            </View>

            <View style={tw.style('items-center gap-1')}>
              <Text
                variant={TextVariant.HeadingMd}
                fontWeight={FontWeight.Bold}
                color={TextColor.TextDefault}
              >
                {order.instrument.name ?? order.instrument.symbol}
              </Text>
              <Text
                variant={TextVariant.DisplaySm}
                fontWeight={FontWeight.Bold}
                color={TextColor.TextDefault}
              >
                {order.formattedPrice ?? order.price ?? 'Market'}
              </Text>
              {order.notionalValueUsd ? (
                <Text
                  variant={TextVariant.BodySmMedium}
                  color={TextColor.TextAlternative}
                >
                  Est. Total {order.notionalValueUsd}
                </Text>
              ) : null}
            </View>

            {/* Badges Row */}
            <View style={tw.style('flex-row items-center gap-2 mt-1')}>
              <View style={tw.style(`px-3 py-1 rounded-full ${sideBgColor}`)}>
                <Text variant={TextVariant.BodySmBold} color={sideTextColor}>
                  {order.side.toUpperCase()} {order.orderType.toUpperCase()}
                </Text>
              </View>

              <View
                style={tw.style(
                  'px-3 py-1 rounded-full bg-default border border-muted',
                )}
              >
                <Text
                  variant={TextVariant.BodySmMedium}
                  color={TextColor.TextAlternative}
                >
                  {formatDomainName(order.domain)}
                </Text>
              </View>

              <View
                style={tw.style(
                  `px-3 py-1 rounded-full ${
                    order.status === 'open'
                      ? 'bg-primary-muted'
                      : order.status === 'partiallyFilled'
                        ? 'bg-warning-muted'
                        : order.status === 'cancelled'
                          ? 'bg-error-muted'
                          : 'bg-muted'
                  }`,
                )}
              >
                <Text
                  variant={TextVariant.BodySmBold}
                  color={
                    order.status === 'open'
                      ? TextColor.PrimaryDefault
                      : order.status === 'partiallyFilled'
                        ? TextColor.WarningDefault
                        : order.status === 'cancelled'
                          ? TextColor.ErrorDefault
                          : TextColor.TextDefault
                  }
                >
                  {order.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Partial Fill Progress Bar */}
          {order.status === 'partiallyFilled' &&
            order.fillPercentage !== undefined && (
              <View
                style={tw.style(
                  'p-4 rounded-2xl bg-default border border-warning gap-2',
                )}
                testID="order-details-fill-progress"
              >
                <View style={tw.style('flex-row justify-between')}>
                  <Text
                    variant={TextVariant.BodySmBold}
                    color={TextColor.WarningDefault}
                  >
                    Partial Fill Progress
                  </Text>
                  <Text
                    variant={TextVariant.BodySmBold}
                    color={TextColor.WarningDefault}
                  >
                    {order.fillPercentage}%
                  </Text>
                </View>
                <View
                  style={tw.style(
                    'w-full h-2 rounded-full bg-muted overflow-hidden',
                  )}
                >
                  <View
                    style={[
                      tw.style(
                        'h-full bg-warning-default rounded-full min-w-2',
                      ),
                      { width: `${order.fillPercentage}%` },
                    ]}
                  />
                </View>
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.TextAlternative}
                >
                  {order.filledSize} filled of {order.formattedSize}
                </Text>
              </View>
            )}

          {/* Metadata Breakdown Section */}
          <View
            style={tw.style(
              'rounded-2xl bg-default border border-muted p-4 gap-3',
            )}
            testID="order-details-metadata"
          >
            <Text
              variant={TextVariant.HeadingSm}
              color={TextColor.TextDefault}
              twClassName="mb-1"
            >
              Order Overview
            </Text>

            {detailRows.map((row) => {
              let valColor = TextColor.TextDefault;
              if (row.variant === 'success')
                valColor = TextColor.SuccessDefault;
              if (row.variant === 'warning')
                valColor = TextColor.WarningDefault;
              if (row.variant === 'error') valColor = TextColor.ErrorDefault;

              return (
                <View
                  key={row.key}
                  style={tw.style(
                    'flex-row items-center justify-between py-2 border-b border-muted',
                  )}
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {row.label}
                  </Text>
                  <Text
                    variant={TextVariant.BodyMdMedium}
                    color={valColor}
                    twClassName="max-w-60 text-right"
                  >
                    {row.value}
                  </Text>
                </View>
              );
            })}

            {/* Copyable Order ID Row */}
            <View
              style={tw.style('flex-row items-center justify-between py-2')}
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                Order ID
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleCopyOrderId}
                style={tw.style('flex-row items-center gap-1.5')}
                testID="order-details-copy-id"
              >
                <Text
                  variant={TextVariant.BodyMdMedium}
                  color={TextColor.TextDefault}
                >
                  {order.id}
                </Text>
                <Icon
                  name={copiedId ? IconName.Check : IconName.Copy}
                  size={IconSize.Sm}
                  color={
                    copiedId
                      ? IconColor.SuccessDefault
                      : IconColor.IconAlternative
                  }
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Footer (Cancel Order) */}
          {order.canCancel && (
            <View style={tw.style('mt-2 gap-2')} testID="order-details-actions">
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Lg}
                isFullWidth
                isDanger
                onPress={handleCancel}
                isLoading={isCanceling}
                testID="order-details-cancel-button"
              >
                Cancel Order
              </Button>
            </View>
          )}
        </ScrollView>
      ) : (
        <Box twClassName="flex-1 items-center justify-center p-4">
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID="order-details-not-found"
          >
            Order not found.
          </Text>
        </Box>
      )}
    </SafeAreaView>
  );
};

export default OrderDetailsView;
