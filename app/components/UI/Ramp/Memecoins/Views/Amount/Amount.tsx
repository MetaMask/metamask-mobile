import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import Keypad, { type KeypadChangeData } from '../../../../../Base/Keypad';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { formatCompactUsd } from '../../../../Rewards/utils/formatUtils';
import { formatPriceWithSubscriptNotation } from '../../../../Predict/utils/format';
import { formatPercentChange } from '../../../../Trending/utils/formatPercentChange';
import { getNetworkBadgeSource } from '../../../../Trending/components/TrendingTokenRowItem/utils';
import useRampAccountAddress from '../../../hooks/useRampAccountAddress';
import {
  CROSSMINT_USD_AMOUNT_PRESETS,
  createCrossmintOrder,
  buildCrossmintCheckoutUrl,
  crossmintChainToCaipChainId,
  SOLANA_MAINNET_CAIP_CHAIN_ID,
  type CrossmintMemecoinToken,
} from '../../crossmint';
import { useMemecoinMarketData } from '../../hooks/useMemecoinMarketData';
import { MEMECOINS_TEST_IDS } from '../../Memecoins.testIds';

/* eslint-disable import-x/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const ApplePayMark = require('../../../../../../images/ApplePayMark.png');
/* eslint-enable import-x/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */

const styles = StyleSheet.create({
  tokenAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  networkBadge: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  presetPressable: {
    flex: 1,
  },
  applePayMark: {
    width: 48,
    height: 20,
    resizeMode: 'contain',
  },
});

export interface AmountParams {
  tokenLocator: string;
  chain: string;
  name: string;
  symbol: string;
  imageUrl?: string;
}

function formatPresetLabel(amount: string): string {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) {
    return `$${amount}`;
  }
  return `$${numeric.toLocaleString('en-US')}`;
}

function formatAmountDisplay(amount: string): string {
  if (!amount) {
    return '$0';
  }
  const [whole, fraction] = amount.split('.');
  const wholeNumber = Number(whole || '0');
  const formattedWhole = Number.isFinite(wholeNumber)
    ? wholeNumber.toLocaleString('en-US')
    : whole;
  return fraction !== undefined
    ? `$${formattedWhole}.${fraction}`
    : `$${formattedWhole}`;
}

function Amount() {
  const navigation = useNavigation<AppNavigationProp>();
  const params = useParams<AmountParams, true>();
  const [amount, setAmount] = useState<string>(
    CROSSMINT_USD_AMOUNT_PRESETS[1] ?? CROSSMINT_USD_AMOUNT_PRESETS[0],
  );
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokenForMarketData = useMemo<CrossmintMemecoinToken>(
    () => ({
      tokenLocator: params.tokenLocator,
      chain: params.chain,
      address: params.tokenLocator.includes(':')
        ? params.tokenLocator.slice(params.tokenLocator.indexOf(':') + 1)
        : params.tokenLocator,
      available: true,
      creditCardPayment: true,
      name: params.name,
      symbol: params.symbol,
      imageUrl: params.imageUrl,
    }),
    [params],
  );

  const { marketDataByLocator } = useMemecoinMarketData([tokenForMarketData]);
  const marketData = marketDataByLocator[params.tokenLocator];

  const caipChainId = useMemo(
    () => crossmintChainToCaipChainId(params.chain) as CaipChainId | null,
    [params.chain],
  );
  const walletAddress = useRampAccountAddress(caipChainId);
  const networkBadgeSource = useMemo(
    () =>
      getNetworkBadgeSource(
        (caipChainId ?? SOLANA_MAINNET_CAIP_CHAIN_ID) as CaipChainId,
      ),
    [caipChainId],
  );

  const displaySymbol = marketData?.symbol || params.symbol;
  const displayImageUrl = marketData?.imageUrl || params.imageUrl;
  const priceLabel = useMemo(() => {
    if (marketData?.price === undefined || !Number.isFinite(marketData.price)) {
      return '—';
    }
    return formatPriceWithSubscriptNotation(marketData.price, 'USD');
  }, [marketData?.price]);

  const percent = useMemo(
    () => formatPercentChange(marketData?.priceChange1d),
    [marketData?.priceChange1d],
  );

  const marketCapLabel = useMemo(() => {
    if (
      marketData?.marketCap === undefined ||
      !Number.isFinite(marketData.marketCap)
    ) {
      return '—';
    }
    return `${formatCompactUsd(marketData.marketCap)} MC`;
  }, [marketData?.marketCap]);

  const percentLabel = useMemo(() => {
    if (!percent.changeLabel) {
      return '—';
    }
    const absolute = percent.changeLabel.replace(/^[+-]/, '');
    if (marketData?.priceChange1d === undefined) {
      return absolute;
    }
    if (marketData.priceChange1d > 0) {
      return `▲ ${absolute}`;
    }
    if (marketData.priceChange1d < 0) {
      return `▼ ${absolute}`;
    }
    return absolute;
  }, [marketData?.priceChange1d, percent.changeLabel]);

  const handleKeypadChange = useCallback(({ value }: KeypadChangeData) => {
    setAmount(value);
    setError(null);
  }, []);

  const handlePresetPress = useCallback((preset: string) => {
    setAmount(preset);
    setError(null);
  }, []);

  const handlePay = useCallback(async () => {
    setError(null);

    if (!walletAddress) {
      setError(strings('memecoins.missing_wallet'));
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError(strings('memecoins.invalid_amount'));
      return;
    }

    setIsCreatingOrder(true);
    try {
      const { order, clientSecret } = await createCrossmintOrder({
        tokenLocator: params.tokenLocator,
        amountUsd: String(numericAmount),
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
        tokenName: marketData?.name || params.name,
        tokenSymbol: marketData?.symbol || params.symbol,
        amountUsd: String(numericAmount),
        imageUrl: marketData?.imageUrl || params.imageUrl,
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
    amount,
    marketData?.imageUrl,
    marketData?.name,
    marketData?.symbol,
    navigation,
    params.imageUrl,
    params.name,
    params.symbol,
    params.tokenLocator,
    walletAddress,
  ]);

  const canPay =
    Boolean(walletAddress) &&
    !isCreatingOrder &&
    Number(amount) > 0 &&
    Number.isFinite(Number(amount));

  return (
    <ScreenLayout testID={MEMECOINS_TEST_IDS.AMOUNT_SCREEN}>
      <HeaderStandard onBack={() => navigation.goBack()} includesTopInset />
      <ScreenLayout.Body>
        <Box twClassName="flex-1 px-4 pb-4">
          <Box twClassName="flex-row items-center justify-between py-2">
            <Box twClassName="flex-row items-center gap-3 flex-1 pr-3">
              {displayImageUrl ? (
                <Image
                  source={{ uri: displayImageUrl }}
                  style={styles.tokenAvatar}
                />
              ) : (
                <Box twClassName="w-11 h-11 rounded-full bg-background-muted items-center justify-center">
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Bold}
                  >
                    {displaySymbol.slice(0, 1)}
                  </Text>
                </Box>
              )}
              <Box twClassName="flex-1">
                <Box twClassName="flex-row items-center gap-1">
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Bold}
                    numberOfLines={1}
                  >
                    {displaySymbol}
                  </Text>
                  {networkBadgeSource ? (
                    <Image
                      source={networkBadgeSource}
                      style={styles.networkBadge}
                    />
                  ) : null}
                </Box>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {marketCapLabel}
                </Text>
              </Box>
            </Box>
            <Box twClassName="items-end">
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {priceLabel}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={percent.changeTextColor}
              >
                {percentLabel}
              </Text>
            </Box>
          </Box>

          <Box twClassName="flex-1 items-center justify-center py-4">
            <Text
              variant={TextVariant.DisplayMd}
              fontWeight={FontWeight.Bold}
              testID={MEMECOINS_TEST_IDS.AMOUNT_VALUE}
            >
              {formatAmountDisplay(amount)}
            </Text>
          </Box>

          <Box twClassName="flex-row gap-2 mb-3">
            {CROSSMINT_USD_AMOUNT_PRESETS.map((preset) => {
              const isSelected = amount === preset;
              return (
                <Pressable
                  key={preset}
                  testID={`${MEMECOINS_TEST_IDS.AMOUNT_PRESET}-${preset}`}
                  onPress={() => handlePresetPress(preset)}
                  style={styles.presetPressable}
                >
                  <Box
                    twClassName={`items-center py-2.5 rounded-xl border ${
                      isSelected
                        ? 'bg-background-muted-pressed border-border-default'
                        : 'bg-background-muted border-border-muted'
                    }`}
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                    >
                      {formatPresetLabel(preset)}
                    </Text>
                  </Box>
                </Pressable>
              );
            })}
          </Box>

          <Box twClassName="mb-3" testID={MEMECOINS_TEST_IDS.AMOUNT_KEYPAD}>
            <Keypad
              value={amount}
              onChange={handleKeypadChange}
              currency="USD"
              decimals={2}
            />
          </Box>

          {!walletAddress ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.ErrorDefault}
              twClassName="text-center mb-2"
            >
              {strings('memecoins.missing_wallet')}
            </Text>
          ) : null}

          {error ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.ErrorDefault}
              twClassName="text-center mb-2"
            >
              {error}
            </Text>
          ) : null}

          <Box twClassName="flex-row items-center justify-between mb-3 px-1">
            <Image source={ApplePayMark} style={styles.applePayMark} />
            <Box twClassName="flex-row items-center gap-1">
              <Icon
                name={IconName.Gift}
                size={IconSize.Sm}
                color={IconColor.PrimaryDefault}
              />
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.PrimaryDefault}
              >
                {strings('memecoins.zero_fee')}
              </Text>
              <Icon
                name={IconName.ArrowDown}
                size={IconSize.Xs}
                color={IconColor.PrimaryDefault}
              />
            </Box>
          </Box>

          <Button
            testID={MEMECOINS_TEST_IDS.APPLE_PAY_BUTTON}
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={!canPay}
            isLoading={isCreatingOrder}
            onPress={handlePay}
          >
            {isCreatingOrder
              ? strings('memecoins.loading')
              : strings('memecoins.buy')}
          </Button>
        </Box>
      </ScreenLayout.Body>
    </ScreenLayout>
  );
}

export default Amount;
