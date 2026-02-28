import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  TextInput,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { RampsOrderStatus } from '@metamask/ramps-controller';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { useRampsQuickBuy } from '../../hooks/useRampsQuickBuy';

const TOKENS = [
  { label: 'ETH', subtitle: 'Ethereum', assetId: 'eip155:1/slip44:60' },
  {
    label: 'BTC',
    subtitle: 'Bitcoin',
    assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
  },
  {
    label: 'SOL',
    subtitle: 'Solana',
    assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
  },
] as const;

function HeadlessBuyDemo() {
  const tw = useTailwind();
  const navigation = useNavigation();

  const [selectedTokenIdx, setSelectedTokenIdx] = useState(0);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(
    null,
  );
  const [amount, setAmount] = useState('100');
  const [danceMode, setDanceMode] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  const selectedAssetId = TOKENS[selectedTokenIdx].assetId;

  const {
    paymentMethods,
    isLoading,
    error,
    openBuyModal,
    order,
    goToBuyOrder,
  } = useRampsQuickBuy({ assetId: selectedAssetId });

  useEffect(() => {
    setSelectedPaymentId(null);
  }, [selectedTokenIdx]);

  useEffect(() => {
    if (!selectedPaymentId && paymentMethods.length > 0 && !isLoading) {
      setSelectedPaymentId(paymentMethods[0].id);
    }
  }, [paymentMethods, isLoading, selectedPaymentId]);

  useEffect(() => {
    navigation.setOptions({ title: 'Headless Buy Demo' });
  }, [navigation]);

  useEffect(() => {
    if (!order) return;
    setLastOrderId(order.order.providerOrderId);
    if (order.order.status === RampsOrderStatus.Completed) {
      setDanceMode(true);
    }
  }, [order]);

  const canSubmit = useMemo(() => {
    const numAmount = Number(amount);
    return selectedPaymentId && numAmount > 0 && !isLoading;
  }, [selectedPaymentId, amount, isLoading]);

  const handleSubmit = useCallback(() => {
    if (!selectedPaymentId) return;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;
    setDanceMode(false);
    openBuyModal({
      assetId: selectedAssetId,
      paymentMethodId: selectedPaymentId,
      amount: numAmount,
    });
  }, [selectedPaymentId, amount, selectedAssetId, openBuyModal]);

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('pb-12')}
        keyboardShouldPersistTaps="handled"
      >
        <Box twClassName="px-4 pt-2 pb-4">
          <Text
            variant={TextVariant.HeadingLG}
            fontWeight={FontWeight.Bold}
            twClassName="mb-1"
          >
            Headless Ramps
          </Text>
          <Text variant={TextVariant.BodySM} twClassName="text-muted mb-6">
            QA demo — select token, payment, amount, then buy.
          </Text>

          {/* Token selector */}
          <Text
            variant={TextVariant.BodySM}
            fontWeight={FontWeight.Bold}
            twClassName="mb-2 uppercase tracking-wide text-muted"
          >
            Token
          </Text>
          <Box flexDirection={BoxFlexDirection.Row} twClassName="mb-5 gap-2">
            {TOKENS.map((tok, idx) => {
              const selected = idx === selectedTokenIdx;
              return (
                <Pressable
                  key={tok.assetId}
                  onPress={() => setSelectedTokenIdx(idx)}
                  style={tw.style(
                    'flex-1 rounded-xl p-3 border-2',
                    selected
                      ? 'border-primary-default bg-primary-muted'
                      : 'border-muted bg-default',
                  )}
                >
                  <Text
                    variant={TextVariant.BodyLG}
                    fontWeight={FontWeight.Bold}
                    twClassName={selected ? 'text-primary-default' : ''}
                  >
                    {tok.label}
                  </Text>
                  <Text variant={TextVariant.BodyXS} twClassName="text-muted">
                    {tok.subtitle}
                  </Text>
                </Pressable>
              );
            })}
          </Box>

          {/* Amount */}
          <Text
            variant={TextVariant.BodySM}
            fontWeight={FontWeight.Bold}
            twClassName="mb-2 uppercase tracking-wide text-muted"
          >
            Amount (fiat)
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="100"
            style={tw.style(
              'border-2 border-muted rounded-xl px-4 py-3 text-default bg-default mb-5 text-lg',
            )}
          />

          {/* Payment methods */}
          <Text
            variant={TextVariant.BodySM}
            fontWeight={FontWeight.Bold}
            twClassName="mb-2 uppercase tracking-wide text-muted"
          >
            Payment Method
          </Text>

          {isLoading && (
            <Box alignItems={BoxAlignItems.Center} twClassName="py-8">
              <ActivityIndicator size="small" />
              <Text variant={TextVariant.BodySM} twClassName="mt-2 text-muted">
                Loading...
              </Text>
            </Box>
          )}

          {error && (
            <Box twClassName="p-3 rounded-xl bg-error-muted mb-4">
              <Text variant={TextVariant.BodySM}>{error}</Text>
            </Box>
          )}

          {!isLoading && !error && paymentMethods.length === 0 && (
            <Text variant={TextVariant.BodySM} twClassName="text-muted py-4">
              No payment methods available for this token.
            </Text>
          )}

          {!isLoading &&
            paymentMethods.map((pm) => {
              const selected = pm.id === selectedPaymentId;
              return (
                <Pressable
                  key={pm.id}
                  onPress={() => setSelectedPaymentId(pm.id)}
                  style={tw.style(
                    'rounded-xl p-3 mb-2 border-2',
                    selected
                      ? 'border-primary-default bg-primary-muted'
                      : 'border-muted bg-default',
                  )}
                >
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                  >
                    <Box
                      twClassName={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                        selected ? 'border-primary-default' : 'border-muted'
                      }`}
                    >
                      {selected && (
                        <Box twClassName="w-3 h-3 rounded-full bg-primary-default" />
                      )}
                    </Box>
                    <Box twClassName="flex-1">
                      <Text
                        variant={TextVariant.BodyMd}
                        fontWeight={FontWeight.Medium}
                      >
                        {pm.name}
                      </Text>
                    </Box>
                  </Box>
                </Pressable>
              );
            })}

          {/* Submit */}
          <Box twClassName="mt-4">
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              onPress={handleSubmit}
              isFullWidth
              isDisabled={!canSubmit}
            >
              Buy
            </Button>
          </Box>

          {/* Success state */}
          {danceMode && (
            <Box twClassName="mt-6 p-5 rounded-2xl bg-success-muted">
              <Text
                variant={TextVariant.HeadingMd}
                fontWeight={FontWeight.Bold}
                twClassName="text-center mb-1"
              >
                Order succeeded, let's dance!
              </Text>
              <Text
                variant={TextVariant.HeadingLG}
                twClassName="text-center mb-3"
              >
                💃🕺
              </Text>
              {lastOrderId && (
                <Button
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Md}
                  onPress={() => goToBuyOrder(lastOrderId)}
                  isFullWidth
                >
                  View Order Details
                </Button>
              )}
            </Box>
          )}

          {/* In-progress status */}
          {order && !danceMode && (
            <Box
              twClassName="mt-4 p-3 rounded-xl bg-warning-muted"
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
            >
              <Text variant={TextVariant.BodySM}>
                Status: {order.order.status}
              </Text>
              <Text variant={TextVariant.BodyXS} twClassName="text-muted">
                was: {order.previousStatus}
              </Text>
            </Box>
          )}
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
}

export default HeadlessBuyDemo;
