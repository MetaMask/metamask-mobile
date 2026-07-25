import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { WebView, type WebViewMessageEvent } from '@metamask/react-native-webview';
import { useNavigation } from '@react-navigation/native';
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
import { shouldStartLoadWithRequest } from '../../../../../../util/browser';
import Device from '../../../../../../util/device';
import {
  getCrossmintFailureMessage,
  isCrossmintPaymentCompleted,
  parseCrossmintCheckoutMessage,
} from '../../crossmint';
import { MEMECOINS_TEST_IDS } from '../../Memecoins.testIds';

export interface CheckoutParams {
  checkoutUrl: string;
  orderId: string;
  tokenName: string;
  amountUsd: string;
}

function Checkout() {
  const navigation = useNavigation<AppNavigationProp>();
  const params = useParams<CheckoutParams, true>();
  const [webviewHeight, setWebviewHeight] = useState(120);
  const [isReady, setIsReady] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const successHandledRef = useRef(false);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
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
      setWebviewHeight(Math.max(74, message.data.height));
    }

    const failure = getCrossmintFailureMessage(message);
    if (failure) {
      setError(failure);
      return;
    }

    if (
      message.event === 'order:updated' &&
      isCrossmintPaymentCompleted(message.data?.order) &&
      !successHandledRef.current
    ) {
      successHandledRef.current = true;
      setIsSuccess(true);
    }
  }, []);

  if (isSuccess) {
    return (
      <ScreenLayout testID={MEMECOINS_TEST_IDS.CHECKOUT_SUCCESS}>
        <HeaderStandard
          title={strings('memecoins.success_title')}
          onClose={() => navigation.goBack()}
          includesTopInset
        />
        <ScreenLayout.Body>
          <Box twClassName="flex-1 items-center justify-center px-6 gap-4">
            <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
              {strings('memecoins.success_heading')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-center text-text-alternative"
            >
              {strings('memecoins.success_body', {
                amount: params.amountUsd,
                token: params.tokenName,
              })}
            </Text>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={() => navigation.navigate(Routes.WALLET_VIEW)}
            >
              {strings('memecoins.done')}
            </Button>
          </Box>
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout testID={MEMECOINS_TEST_IDS.CHECKOUT_ERROR}>
        <HeaderStandard
          title={strings('memecoins.checkout_title')}
          onBack={() => navigation.goBack()}
          includesTopInset
        />
        <ScreenLayout.Body>
          <Box twClassName="flex-1 items-center justify-center px-6 gap-4">
            <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
              {strings('memecoins.checkout_error_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-center text-text-alternative"
            >
              {error}
            </Text>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              onPress={() => navigation.goBack()}
            >
              {strings('memecoins.retry')}
            </Button>
          </Box>
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout testID={MEMECOINS_TEST_IDS.CHECKOUT_SCREEN}>
      <HeaderStandard
        title={strings('memecoins.checkout_title')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <ScreenLayout.Body>
        <Box twClassName="flex-1 px-4 py-6 gap-4">
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-center text-text-alternative"
          >
            {strings('memecoins.checkout_subtitle', {
              amount: params.amountUsd,
              token: params.tokenName,
            })}
          </Text>

          {!isReady ? (
            <Box
              twClassName="items-center justify-center py-8"
              testID={MEMECOINS_TEST_IDS.CHECKOUT_LOADING}
            >
              <ActivityIndicator />
              <Text
                variant={TextVariant.BodySm}
                twClassName="mt-3 text-text-alternative"
              >
                {strings('memecoins.preparing_apple_pay')}
              </Text>
            </Box>
          ) : null}

          <WebView
            testID={MEMECOINS_TEST_IDS.CHECKOUT_WEBVIEW}
            source={{ uri: params.checkoutUrl }}
            style={{
              height: webviewHeight,
              width: '100%',
              backgroundColor: 'transparent',
              opacity: isReady ? 1 : 0,
            }}
            enableApplePay
            allowsInlineMediaPlayback
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
            onMessage={handleMessage}
            onShouldStartLoadWithRequest={shouldStartLoadWithRequest}
            // Match Crossmint RN SDK mobile user agent hints for Apple Pay.
            userAgent={
              Device.isIos()
                ? undefined
                : 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
            }
          />
        </Box>
      </ScreenLayout.Body>
    </ScreenLayout>
  );
}

export default Checkout;
