import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
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
import { useOrdersStore } from '../../../../util/orders/ordersStore';
import type { OrderItem } from '../../../../util/orders/types';

interface CreateSampleLimitOrderModalProps {
  isVisible: boolean;
  onClose: () => void;
  onOrderCreated?: (order: OrderItem) => void;
}

export const CreateSampleLimitOrderModal: React.FC<
  CreateSampleLimitOrderModalProps
> = ({ isVisible, onClose, onOrderCreated }) => {
  const tw = useTailwind();
  const { createSampleEthLimitOrder } = useOrdersStore();

  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [size, setSize] = useState('2.0');
  const [price, setPrice] = useState('2350.00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    setIsSubmitting(true);

    setTimeout(() => {
      const newOrder = createSampleEthLimitOrder({
        side,
        size,
        price,
      });

      setIsSubmitting(false);
      Alert.alert(
        'Limit Order Placed!',
        `Your ${side.toUpperCase()} limit order for ${size} ETH @ $${price} has been placed and is now active across all 3 surfaces (Token Details, Swaps feature, and Activity).`,
        [
          {
            text: 'View Surfaces',
            onPress: () => {
              onOrderCreated?.(newOrder);
              onClose();
            },
          },
        ],
      );
    }, 600);
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={tw.style('flex-1 bg-default')}>
        {/* Header */}
        <View
          style={tw.style(
            'flex-row items-center justify-between px-4 py-3 border-b border-muted',
          )}
        >
          <ButtonIcon
            iconName={IconName.Close}
            iconColor={IconColor.Default}
            size={ButtonIconSizes.Md}
            onPress={onClose}
          />
          <Text variant={TextVariant.HeadingSm} color={TextColor.TextDefault}>
            Place Sample Limit Order
          </Text>
          <View style={tw.style('w-8')} />
        </View>

        <View style={tw.style('p-4 gap-4 flex-1')}>
          <View style={tw.style('p-3 rounded-xl bg-primary-muted')}>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.PrimaryDefault}
              fontWeight={FontWeight.Medium}
            >
              PoC Demo: Placed orders will immediately sync live across the
              Token Details Page, Feature pages, and Activity.
            </Text>
          </View>

          {/* Side Selector: Buy vs Sell */}
          <View style={tw.style('flex-row gap-2')}>
            <TouchableOpacity
              onPress={() => setSide('buy')}
              style={tw.style(
                `flex-1 py-2.5 rounded-xl items-center border ${
                  side === 'buy'
                    ? 'bg-success-muted border-success'
                    : 'bg-muted border-muted'
                }`,
              )}
            >
              <Text
                variant={TextVariant.BodyMdBold}
                color={
                  side === 'buy' ? TextColor.Success : TextColor.TextAlternative
                }
              >
                Buy ETH
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSide('sell')}
              style={tw.style(
                `flex-1 py-2.5 rounded-xl items-center border ${
                  side === 'sell'
                    ? 'bg-error-muted border-error'
                    : 'bg-muted border-muted'
                }`,
              )}
            >
              <Text
                variant={TextVariant.BodyMdBold}
                color={
                  side === 'sell'
                    ? TextColor.ErrorDefault
                    : TextColor.TextAlternative
                }
              >
                Sell ETH
              </Text>
            </TouchableOpacity>
          </View>

          {/* Size Input */}
          <View style={tw.style('gap-1')}>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              Order Size (ETH)
            </Text>
            <TextInput
              value={size}
              onChangeText={setSize}
              keyboardType="decimal-pad"
              placeholder="e.g. 2.0"
              style={tw.style(
                'p-3 rounded-xl bg-muted border border-muted text-base font-semibold text-default',
              )}
            />
          </View>

          {/* Price Input */}
          <View style={tw.style('gap-1')}>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              Limit Price (USD)
            </Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="e.g. 2350.00"
              style={tw.style(
                'p-3 rounded-xl bg-muted border border-muted text-base font-semibold text-default',
              )}
            />
          </View>

          {/* Order Summary */}
          <View
            style={tw.style(
              'p-3.5 rounded-xl bg-default border border-muted gap-2 mt-2',
            )}
          >
            <View style={tw.style('flex-row justify-between')}>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                Instrument
              </Text>
              <Text
                variant={TextVariant.BodySmBold}
                color={TextColor.TextDefault}
              >
                ETH / USDC
              </Text>
            </View>
            <View style={tw.style('flex-row justify-between')}>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                Est. Total Value
              </Text>
              <Text
                variant={TextVariant.BodySmBold}
                color={TextColor.TextDefault}
              >
                $
                {(parseFloat(size || '0') * parseFloat(price || '0')).toFixed(
                  2,
                )}
              </Text>
            </View>
            <View style={tw.style('flex-row justify-between')}>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                Cancellation Cost
              </Text>
              <Text variant={TextVariant.BodySmBold} color={TextColor.Success}>
                Free (Off-Chain)
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <View style={tw.style('mt-auto mb-4')}>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              isLoading={isSubmitting}
              onPress={handleSubmit}
            >
              Place Limit Order
            </Button>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};
