import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import {
  WebView,
  type WebViewMessageEvent,
} from '@metamask/react-native-webview';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import {
  Box,
  FontWeight,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { shouldStartLoadWithRequest } from '../../../../../../util/browser';
import Device from '../../../../../../util/device';
import { colors as commonColors } from '../../../../../../styles/common';
import {
  getCrossmintFailureMessage,
  isCrossmintPaymentCompleted,
  isCrossmintPaymentInProgress,
  parseCrossmintCheckoutMessage,
} from '../../crossmint';
import { MEMECOINS_TEST_IDS } from '../../Memecoins.testIds';
import {
  CheckoutFailureView,
  CheckoutProcessingView,
  CheckoutSuccessView,
} from './CheckoutPhaseViews';

export interface CheckoutParams {
  checkoutUrl: string;
  orderId: string;
  tokenName: string;
  tokenSymbol: string;
  amountUsd: string;
  imageUrl?: string;
}

type CheckoutPhase = 'sheet' | 'processing' | 'success' | 'failure';

const createStyles = (webviewHeight: number, isReady: boolean) =>
  StyleSheet.create({
    hiddenHost: {
      position: 'absolute',
      width: 1,
      height: 1,
      opacity: 0,
      overflow: 'hidden',
    },
    webViewVisible: {
      width: '100%',
      height: webviewHeight,
      backgroundColor: commonColors.transparent,
      opacity: isReady ? 1 : 0,
    },
    webViewHidden: {
      width: 1,
      height: 1,
      opacity: 0,
    },
  });

function Checkout() {
  const navigation = useNavigation<AppNavigationProp>();
  const params = useParams<CheckoutParams, true>();
  const [phase, setPhase] = useState<CheckoutPhase>('sheet');
  const [webviewHeight, setWebviewHeight] = useState(120);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phaseRef = useRef<CheckoutPhase>('sheet');
  const successHandledRef = useRef(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const styles = useMemo(
    () => createStyles(webviewHeight, isReady),
    [isReady, webviewHeight],
  );

  const setCheckoutPhase = useCallback((next: CheckoutPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  useEffect(
    () => () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    },
    [],
  );

  const goHome = useCallback(() => {
    navigation.navigate(Routes.WALLET_VIEW);
  }, [navigation]);

  const handleRetry = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseCrossmintCheckoutMessage(event.nativeEvent.data);
      if (!message) {
        return;
      }

      if (message.event === 'ui:express-checkout.ready') {
        setIsReady(true);
      }

      if (
        message.event === 'ui:height.changed' &&
        typeof message.data?.height === 'number'
      ) {
        setWebviewHeight(Math.max(74, Math.min(220, message.data.height)));
      }

      const failure = getCrossmintFailureMessage(message);
      if (failure) {
        setError(failure);
        setCheckoutPhase('failure');
        return;
      }

      if (message.event !== 'order:updated') {
        return;
      }

      const order = message.data?.order;

      if (isCrossmintPaymentInProgress(order) && phaseRef.current === 'sheet') {
        setCheckoutPhase('processing');
        return;
      }

      if (isCrossmintPaymentCompleted(order) && !successHandledRef.current) {
        successHandledRef.current = true;
        if (phaseRef.current === 'sheet') {
          setCheckoutPhase('processing');
          successTimerRef.current = setTimeout(() => {
            setCheckoutPhase('success');
          }, 1400);
        } else {
          setCheckoutPhase('success');
        }
      }
    },
    [setCheckoutPhase],
  );

  const tokenLabel = params.tokenSymbol || params.tokenName;
  const showSheet = phase === 'sheet';

  return (
    <ScreenLayout testID={MEMECOINS_TEST_IDS.CHECKOUT_SCREEN}>
      {showSheet ? (
        <HeaderStandard onBack={() => navigation.goBack()} includesTopInset />
      ) : null}

      <ScreenLayout.Body>
        {phase === 'processing' ? (
          <CheckoutProcessingView
            tokenName={params.tokenName}
            tokenSymbol={tokenLabel}
            amountUsd={params.amountUsd}
            imageUrl={params.imageUrl}
          />
        ) : null}

        {phase === 'success' ? (
          <CheckoutSuccessView
            tokenName={params.tokenName}
            tokenSymbol={tokenLabel}
            amountUsd={params.amountUsd}
            imageUrl={params.imageUrl}
            onDone={goHome}
          />
        ) : null}

        {phase === 'failure' ? (
          <CheckoutFailureView
            errorMessage={error}
            onRetry={handleRetry}
            onDone={goHome}
          />
        ) : null}

        <Box
          twClassName={showSheet ? 'flex-1 justify-end px-4 pb-6' : undefined}
          style={showSheet ? undefined : styles.hiddenHost}
          pointerEvents={showSheet ? 'auto' : 'none'}
        >
          <Box
            twClassName={
              showSheet
                ? 'rounded-t-2xl bg-background-muted border border-border-muted px-4 pt-5 pb-3 gap-4'
                : undefined
            }
          >
            {showSheet ? (
              <>
                <Box twClassName="items-center gap-2">
                  <Box twClassName="w-10 h-1 rounded-full bg-border-muted" />
                  <Text
                    variant={TextVariant.HeadingSm}
                    fontWeight={FontWeight.Bold}
                    twClassName="text-center"
                  >
                    {strings('memecoins.apple_pay_sheet_title')}
                  </Text>
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                    twClassName="text-center"
                  >
                    {strings('memecoins.apple_pay_sheet_body', {
                      amount: params.amountUsd,
                      token: tokenLabel,
                    })}
                  </Text>
                </Box>

                {!isReady ? (
                  <Box
                    twClassName="items-center justify-center py-6 gap-3"
                    testID={MEMECOINS_TEST_IDS.CHECKOUT_LOADING}
                  >
                    <ActivityIndicator />
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      {strings('memecoins.preparing_apple_pay')}
                    </Text>
                  </Box>
                ) : null}
              </>
            ) : null}

            <WebView
              testID={MEMECOINS_TEST_IDS.CHECKOUT_WEBVIEW}
              source={{ uri: params.checkoutUrl }}
              style={showSheet ? styles.webViewVisible : styles.webViewHidden}
              enableApplePay
              allowsInlineMediaPlayback
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['*']}
              onMessage={handleMessage}
              onShouldStartLoadWithRequest={shouldStartLoadWithRequest}
              userAgent={
                Device.isIos()
                  ? undefined
                  : 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
              }
            />

            {showSheet ? (
              <Pressable onPress={() => navigation.goBack()}>
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                  twClassName="text-center py-2"
                >
                  {strings('transaction.cancel')}
                </Text>
              </Pressable>
            ) : null}
          </Box>
        </Box>
      </ScreenLayout.Body>
    </ScreenLayout>
  );
}

export default Checkout;
