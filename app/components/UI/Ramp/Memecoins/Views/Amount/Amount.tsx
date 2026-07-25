import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
  FontWeight,
  HeaderStandard,
} from '@metamask/design-system-react-native';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../../util/navigation/navUtils';
import useRampAccountAddress from '../../../hooks/useRampAccountAddress';
import {
  CROSSMINT_USD_AMOUNT_PRESETS,
  createCrossmintOrder,
  buildCrossmintCheckoutUrl,
  crossmintChainToCaipChainId,
} from '../../crossmint';
import { MEMECOINS_TEST_IDS } from '../../Memecoins.testIds';

export interface AmountParams {
  tokenLocator: string;
  chain: string;
  name: string;
  symbol: string;
  imageUrl?: string;
}

function Amount() {
  const navigation = useNavigation<AppNavigationProp>();
  const params = useParams<AmountParams, true>();
  const [selectedAmount, setSelectedAmount] = useState<string>(
    CROSSMINT_USD_AMOUNT_PRESETS[0],
  );
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const caipChainId = useMemo(
    () => crossmintChainToCaipChainId(params.chain) as CaipChainId | null,
    [params.chain],
  );
  const walletAddress = useRampAccountAddress(caipChainId);

  const handlePay = useCallback(async () => {
    setError(null);

    if (!walletAddress) {
      setError(strings('memecoins.missing_wallet'));
      return;
    }

    setIsCreatingOrder(true);
    try {
      const { order, clientSecret } = await createCrossmintOrder({
        tokenLocator: params.tokenLocator,
        amountUsd: selectedAmount,
        walletAddress,
      });

      const checkoutUrl = buildCrossmintCheckoutUrl({
        orderId: order.orderId,
        clientSecret,
        applePayOnly: true,
      });

      navigation.navigate(Routes.RAMP.MEMECOINS.CHECKOUT, {
        checkoutUrl,
        orderId: order.orderId,
        tokenName: params.name,
        amountUsd: selectedAmount,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : strings('memecoins.create_order_error'),
      );
    } finally {
      setIsCreatingOrder(false);
    }
  }, [
    navigation,
    params.name,
    params.tokenLocator,
    selectedAmount,
    walletAddress,
  ]);

  return (
    <ScreenLayout testID={MEMECOINS_TEST_IDS.AMOUNT_SCREEN}>
      <HeaderStandard
        title={strings('memecoins.amount_title', { symbol: params.symbol })}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <ScreenLayout.Body>
        <Box twClassName="flex-1 px-4 py-6 gap-6">
          <Box twClassName="items-center gap-3">
            {params.imageUrl ? (
              <Image
                source={{ uri: params.imageUrl }}
                style={{ width: 64, height: 64, borderRadius: 32 }}
              />
            ) : null}
            <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
              {params.name}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-text-alternative"
            >
              {strings('memecoins.amount_subtitle')}
            </Text>
          </Box>

          <Box twClassName="flex-row justify-center gap-3">
            {CROSSMINT_USD_AMOUNT_PRESETS.map((amount) => {
              const isSelected = amount === selectedAmount;
              return (
                <Pressable
                  key={amount}
                  testID={`${MEMECOINS_TEST_IDS.AMOUNT_PRESET}-${amount}`}
                  onPress={() => setSelectedAmount(amount)}
                >
                  <Box
                    twClassName={`px-5 py-3 rounded-xl border ${
                      isSelected
                        ? 'bg-primary-muted border-primary-default'
                        : 'bg-background-muted border-border-muted'
                    }`}
                  >
                    <Text
                      variant={TextVariant.BodyLg}
                      fontWeight={FontWeight.Medium}
                    >
                      ${amount}
                    </Text>
                  </Box>
                </Pressable>
              );
            })}
          </Box>

          {walletAddress ? (
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-center text-text-alternative"
            >
              {strings('memecoins.deliver_to', {
                address: `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`,
              })}
            </Text>
          ) : (
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-center text-error-default"
            >
              {strings('memecoins.missing_wallet')}
            </Text>
          )}

          {error ? (
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-center text-error-default"
            >
              {error}
            </Text>
          ) : null}

          <Box twClassName="mt-auto gap-3">
            <Button
              testID={MEMECOINS_TEST_IDS.APPLE_PAY_BUTTON}
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              isDisabled={!walletAddress || isCreatingOrder}
              isLoading={isCreatingOrder}
              onPress={handlePay}
            >
              {strings('memecoins.pay_with_apple_pay', {
                amount: selectedAmount,
              })}
            </Button>
          </Box>
        </Box>
      </ScreenLayout.Body>
    </ScreenLayout>
  );
}

export default Amount;
