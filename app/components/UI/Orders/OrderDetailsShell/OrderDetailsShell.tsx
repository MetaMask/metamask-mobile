import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import type { OrderItem } from '../../../../util/orders/types';
import {
  resolveOrderDetailRows,
  formatDomainName,
} from '../../../../util/orders/orderHelpers';

interface OrderDetailsShellProps {
  order: OrderItem;
  onClose?: () => void;
  onCancelSuccess?: (order: OrderItem) => void;
  testID?: string;
}

export const OrderDetailsShell: React.FC<OrderDetailsShellProps> = ({
  order,
  onClose,
  onCancelSuccess,
  testID,
}) => {
  const tw = useTailwind();
  const [isCanceling, setIsCanceling] = useState(false);
  const detailRows = resolveOrderDetailRows(order);

  const isBuySide =
    order.side === 'buy' || order.side === 'long' || order.side === 'yes';

  const sideBgColor = isBuySide ? 'bg-success-muted' : 'bg-error-muted';
  const sideTextColor = isBuySide ? TextColor.Success : TextColor.ErrorDefault;

  const handleCancel = async () => {
    // Show confirmation dialog if on-chain or standard
    const confirmMessage =
      order.cancelType === 'onChain'
        ? `Cancelling this order on ${order.instrument.networkName ?? 'network'} requires an on-chain transaction with gas fees (~${order.estimatedCancelFeeUsd ?? '$0.50'}). Proceed?`
        : 'Are you sure you want to cancel this order? This action cannot be undone.';

    Alert.alert('Cancel Order', confirmMessage, [
      { text: 'Keep Order', style: 'cancel' },
      {
        text: 'Cancel Order',
        style: 'destructive',
        onPress: async () => {
          setIsCanceling(true);
          // Simulate action delay for PoC
          setTimeout(() => {
            setIsCanceling(false);
            Alert.alert(
              'Order Cancelled',
              `Your ${order.instrument.symbol} order has been successfully cancelled.`,
            );
            onCancelSuccess?.(order);
            onClose?.();
          }, 900);
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={testID ?? 'order-details-shell'}
    >
      {/* Navigation Header */}
      <View
        style={tw.style(
          'flex-row items-center justify-between px-4 py-3 border-b border-muted',
        )}
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          iconColor={IconColor.Default}
          size={ButtonIconSizes.Md}
          onPress={onClose}
          testID="order-details-back-button"
        />
        <Text variant={TextVariant.HeadingSm} color={TextColor.TextDefault}>
          Order Details
        </Text>
        <View style={tw.style('w-8')} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('p-4 gap-4 pb-12')}
      >
        {/* Hero Section */}
        <View
          style={tw.style(
            'items-center p-5 rounded-2xl bg-muted border border-muted gap-2',
          )}
        >
          <View
            style={tw.style(
              'w-14 h-14 rounded-full bg-default items-center justify-center border border-muted shadow-sm',
            )}
          >
            <Text variant={TextVariant.HeadingLg} color={TextColor.TextDefault}>
              {order.instrument.baseAssetSymbol.slice(0, 3)}
            </Text>
          </View>

          <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
            {order.instrument.name ?? order.instrument.symbol}
          </Text>

          <View style={tw.style('flex-row items-center gap-2 mt-1')}>
            <View style={tw.style(`px-2.5 py-1 rounded-full ${sideBgColor}`)}>
              <Text variant={TextVariant.BodySmBold} color={sideTextColor}>
                {order.side.toUpperCase()} {order.orderType.toUpperCase()}
              </Text>
            </View>

            <View
              style={tw.style(
                'px-2.5 py-1 rounded-full bg-default border border-muted',
              )}
            >
              <Text
                variant={TextVariant.BodySmMedium}
                color={TextColor.TextAlternative}
              >
                {formatDomainName(order.domain)}
              </Text>
            </View>
          </View>
        </View>

        {/* Partial Fill Progress Bar */}
        {order.status === 'partiallyFilled' &&
          order.fillPercentage !== undefined && (
            <View
              style={tw.style(
                'p-4 rounded-xl bg-default border border-warning gap-2',
              )}
            >
              <View style={tw.style('flex-row justify-between')}>
                <Text
                  variant={TextVariant.BodySmBold}
                  color={TextColor.Warning}
                >
                  Partial Fill Progress
                </Text>
                <Text
                  variant={TextVariant.BodySmBold}
                  color={TextColor.Warning}
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
                    tw.style('h-full bg-warning rounded-full'),
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

        {/* Key-Value Details Card */}
        <View
          style={tw.style(
            'rounded-2xl bg-default border border-muted p-4 gap-3',
          )}
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
            if (row.variant === 'success') valColor = TextColor.Success;
            if (row.variant === 'warning') valColor = TextColor.Warning;
            if (row.variant === 'error') valColor = TextColor.ErrorDefault;

            return (
              <View
                key={row.key}
                style={tw.style(
                  'flex-row items-center justify-between py-1.5 border-b border-muted',
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
        </View>

        {/* Action Footer */}
        {order.canCancel && (
          <View style={tw.style('mt-4 gap-2')}>
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
    </SafeAreaView>
  );
};
