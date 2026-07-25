import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';
import type { WebViewMessageEvent } from '@metamask/react-native-webview';
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
  crossmintChainToCaipChainId,
  getCrossmintFailureMessage,
  isCrossmintPaymentCompleted,
  isCrossmintPaymentInProgress,
  parseCrossmintCheckoutMessage,
  SOLANA_MAINNET_CAIP_CHAIN_ID,
  type CrossmintMemecoinToken,
} from '../../crossmint';
import ApplePayCheckoutOverlay from '../../components/ApplePayCheckoutOverlay';
import { useMemecoinMarketData } from '../../hooks/useMemecoinMarketData';
import { usePrepareApplePayCheckout } from '../../hooks/usePrepareApplePayCheckout';
import { MEMECOINS_TEST_IDS } from '../../Memecoins.testIds';
import {
  CheckoutFailureView,
  CheckoutProcessingView,
  CheckoutSuccessView,
} from '../Checkout/CheckoutPhaseViews';

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

type PurchasePhase = 'quote' | 'processing' | 'success' | 'failure';

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
  const [phase, setPhase] = useState<PurchasePhase>('quote');
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [isApplePayReady, setIsApplePayReady] = useState(false);
  const [webviewHeight, setWebviewHeight] = useState(120);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const phaseRef = useRef<PurchasePhase>('quote');
  const successHandledRef = useRef(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const displayName = marketData?.name || params.name;
  const displaySymbol = marketData?.symbol || params.symbol;
  const displayImageUrl = marketData?.imageUrl || params.imageUrl;
  const tokenLabel = displaySymbol || displayName;

  const isQuotePhase = phase === 'quote';
  const {
    prepared,
    isPreparing,
    error: prepareError,
    clearError: clearPrepareError,
  } = usePrepareApplePayCheckout({
    tokenLocator: params.tokenLocator,
    amount,
    walletAddress,
    enabled: isQuotePhase,
  });

  useEffect(() => {
    setIsApplePayReady(false);
    setWebviewHeight(120);
  }, [prepared?.checkoutUrl]);

  useEffect(
    () => () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    },
    [],
  );

  const setPurchasePhase = useCallback((next: PurchasePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

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

  const handleKeypadChange = useCallback(
    ({ value }: KeypadChangeData) => {
      setAmount(value);
      clearPrepareError();
      setCheckoutError(null);
    },
    [clearPrepareError],
  );

  const handlePresetPress = useCallback(
    (preset: string) => {
      setAmount(preset);
      clearPrepareError();
      setCheckoutError(null);
    },
    [clearPrepareError],
  );

  const goHome = useCallback(() => {
    navigation.navigate(Routes.WALLET_VIEW);
  }, [navigation]);

  const handleRetry = useCallback(() => {
    successHandledRef.current = false;
    setCheckoutError(null);
    setIsSheetVisible(false);
    setPurchasePhase('quote');
  }, [setPurchasePhase]);

  const handleCloseSheet = useCallback(() => {
    setIsSheetVisible(false);
  }, []);

  const handlePay = useCallback(() => {
    if (!prepared || !isApplePayReady) {
      return;
    }
    setIsSheetVisible(true);
  }, [isApplePayReady, prepared]);

  const handleCheckoutMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseCrossmintCheckoutMessage(event.nativeEvent.data);
      if (!message) {
        return;
      }

      if (message.event === 'ui:express-checkout.ready') {
        setIsApplePayReady(true);
      }

      if (
        message.event === 'ui:height.changed' &&
        typeof message.data?.height === 'number'
      ) {
        setWebviewHeight(Math.max(74, Math.min(220, message.data.height)));
      }

      const failure = getCrossmintFailureMessage(message);
      if (failure) {
        setCheckoutError(failure);
        setIsSheetVisible(false);
        setPurchasePhase('failure');
        return;
      }

      if (message.event !== 'order:updated') {
        return;
      }

      const order = message.data?.order;

      if (isCrossmintPaymentInProgress(order) && phaseRef.current === 'quote') {
        setIsSheetVisible(false);
        setPurchasePhase('processing');
        return;
      }

      if (isCrossmintPaymentCompleted(order) && !successHandledRef.current) {
        successHandledRef.current = true;
        setIsSheetVisible(false);
        if (phaseRef.current === 'quote') {
          setPurchasePhase('processing');
          successTimerRef.current = setTimeout(() => {
            setPurchasePhase('success');
          }, 1400);
        } else {
          setPurchasePhase('success');
        }
      }
    },
    [setPurchasePhase],
  );

  const isBuyLoading = isPreparing || (Boolean(prepared) && !isApplePayReady);
  const canPay =
    Boolean(walletAddress) &&
    Boolean(prepared) &&
    isApplePayReady &&
    !isPreparing &&
    Number(amount) > 0 &&
    Number.isFinite(Number(amount));

  const errorMessage = checkoutError || prepareError;

  return (
    <ScreenLayout testID={MEMECOINS_TEST_IDS.AMOUNT_SCREEN}>
      {isQuotePhase ? (
        <HeaderStandard onBack={() => navigation.goBack()} includesTopInset />
      ) : null}

      <ScreenLayout.Body>
        {phase === 'processing' ? (
          <CheckoutProcessingView
            tokenName={displayName}
            tokenSymbol={tokenLabel}
            amountUsd={prepared?.amountUsd ?? amount}
            imageUrl={displayImageUrl}
          />
        ) : null}

        {phase === 'success' ? (
          <CheckoutSuccessView
            tokenName={displayName}
            tokenSymbol={tokenLabel}
            amountUsd={prepared?.amountUsd ?? amount}
            imageUrl={displayImageUrl}
            onDone={goHome}
          />
        ) : null}

        {phase === 'failure' ? (
          <CheckoutFailureView
            errorMessage={errorMessage}
            onRetry={handleRetry}
            onDone={goHome}
          />
        ) : null}

        {isQuotePhase ? (
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
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
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

            {errorMessage && isQuotePhase ? (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.ErrorDefault}
                twClassName="text-center mb-2"
              >
                {errorMessage}
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
              isLoading={isBuyLoading}
              onPress={handlePay}
            >
              {isBuyLoading
                ? strings('memecoins.preparing_apple_pay')
                : strings('memecoins.buy')}
            </Button>
          </Box>
        ) : null}

        {prepared?.checkoutUrl &&
        (phase === 'quote' || phase === 'processing') ? (
          <ApplePayCheckoutOverlay
            checkoutUrl={prepared.checkoutUrl}
            isSheetVisible={isSheetVisible && phase === 'quote'}
            webviewHeight={webviewHeight}
            amountUsd={prepared.amountUsd}
            tokenLabel={tokenLabel}
            onMessage={handleCheckoutMessage}
            onCloseSheet={handleCloseSheet}
          />
        ) : null}
      </ScreenLayout.Body>
    </ScreenLayout>
  );
}

export default Amount;
