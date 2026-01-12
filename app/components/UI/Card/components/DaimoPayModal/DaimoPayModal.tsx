import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useParams } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';
import DaimoPayService, {
  DaimoPayEvent,
  DaimoPayEventType,
} from '../../services/DaimoPayService';
import { DaimoPayModalSelectors } from '../../../../../../e2e/selectors/Card/DaimoPayModal.selectors';

// Polling configuration for production mode
const POLLING_INTERVAL_MS = 5000;
const POLLING_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export interface DaimoPayModalParams {
  payId: string;
}

const baseStyles = StyleSheet.create({
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
  },
});

const DaimoPayModal: React.FC = () => {
  const webViewRef = useRef<WebView>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const pollingStartTimeRef = useRef<number | null>(null);

  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { payId } = useParams<DaimoPayModalParams>();
  const tw = useTailwind();
  const [error, setError] = useState<string | null>(null);

  const webViewUrl = DaimoPayService.buildWebViewUrl(payId);
  const isProduction = DaimoPayService.isProduction();

  // Clean up polling on unmount
  useEffect(
    () => () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    },
    [],
  );

  const handleClose = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.DAIMO_PAY_CLOSED,
          screen: CardScreens.DAIMO_PAY,
        })
        .build(),
    );
    navigation.goBack();
  }, [trackEvent, createEventBuilder, navigation]);

  const handlePaymentSuccess = useCallback(
    (txHash?: string, chainId?: number) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action: CardActions.DAIMO_PAYMENT_COMPLETED,
            screen: CardScreens.DAIMO_PAY,
            transaction_hash: txHash,
            chain_id: chainId,
          })
          .build(),
      );

      // Stop polling if active
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      // Navigate to success screen
      navigation.navigate(
        Routes.CARD.ORDER_COMPLETED as never,
        {
          paymentMethod: 'crypto',
          transactionHash: txHash,
        } as never,
      );
    },
    [navigation, trackEvent, createEventBuilder],
  );

  const handlePaymentBounced = useCallback(
    (errorMessage?: string) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action: CardActions.DAIMO_PAYMENT_BOUNCED,
            screen: CardScreens.DAIMO_PAY,
            error: errorMessage,
          })
          .build(),
      );

      setError(
        errorMessage || strings('card.daimo_pay_modal.payment_bounced_error'),
      );
    },
    [trackEvent, createEventBuilder],
  );

  // Start polling for payment status (production mode only)
  const startPolling = useCallback(() => {
    if (!isProduction || pollingIntervalRef.current) {
      return;
    }

    pollingStartTimeRef.current = Date.now();

    pollingIntervalRef.current = setInterval(async () => {
      // Check for timeout
      if (
        pollingStartTimeRef.current &&
        Date.now() - pollingStartTimeRef.current > POLLING_TIMEOUT_MS
      ) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setError(strings('card.daimo_pay_modal.timeout_error'));
        return;
      }

      try {
        const status = await DaimoPayService.pollPaymentStatus(payId);

        if (status.status === 'completed') {
          handlePaymentSuccess(status.transactionHash, status.chainId);
        } else if (status.status === 'failed') {
          handlePaymentBounced(status.errorMessage);
        }
      } catch {
        // Continue polling on error, don't stop
      }
    }, POLLING_INTERVAL_MS);
  }, [isProduction, payId, handlePaymentSuccess, handlePaymentBounced]);

  // Handle Daimo Pay events from WebView
  const handleDaimoEvent = useCallback(
    (event: DaimoPayEvent) => {
      const eventType: DaimoPayEventType = event.type;

      switch (eventType) {
        case 'modalOpened':
          trackEvent(
            createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
              .addProperties({
                screen: CardScreens.DAIMO_PAY,
              })
              .build(),
          );
          break;

        case 'modalClosed':
          handleClose();
          break;

        case 'paymentStarted':
          trackEvent(
            createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
              .addProperties({
                action: CardActions.DAIMO_PAYMENT_STARTED,
                screen: CardScreens.DAIMO_PAY,
              })
              .build(),
          );
          // Start polling in production mode
          startPolling();
          break;

        case 'paymentCompleted':
          // In demo mode, rely on WebView event
          // In production mode, polling will confirm the payment
          if (!isProduction) {
            handlePaymentSuccess(event.payload.txHash, event.payload.chainId);
          }
          break;

        case 'paymentBounced':
          handlePaymentBounced();
          break;
      }
    },
    [
      trackEvent,
      createEventBuilder,
      handleClose,
      handlePaymentSuccess,
      handlePaymentBounced,
      startPolling,
      isProduction,
    ],
  );

  // Handle WebView messages
  const handleMessage = useCallback(
    (messageEvent: WebViewMessageEvent) => {
      const { data } = messageEvent.nativeEvent;
      const event = DaimoPayService.parseWebViewEvent(data);

      if (event) {
        handleDaimoEvent(event);
      }
    },
    [handleDaimoEvent],
  );

  // Handle navigation requests - open external links in browser
  const handleShouldStartLoadWithRequest = useCallback(
    (request: { url: string }) => {
      if (DaimoPayService.shouldLoadInWebView(request.url)) {
        return true;
      }

      // Open external wallet deep links
      Linking.openURL(request.url);
      return false;
    },
    [],
  );

  const handleError = useCallback(() => {
    setError(strings('card.daimo_pay_modal.load_error'));
  }, []);

  if (error) {
    return (
      <View
        style={[baseStyles.absoluteFill, tw.style('bg-transparent')]}
        testID={DaimoPayModalSelectors.CONTAINER}
      >
        <View style={tw.style('flex-1 justify-center items-center p-4')}>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            twClassName="text-error-default text-center"
            testID={DaimoPayModalSelectors.ERROR_TEXT}
          >
            {error}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[baseStyles.absoluteFill, tw.style('bg-transparent')]}
      testID={DaimoPayModalSelectors.CONTAINER}
    >
      <WebView
        ref={webViewRef}
        source={{ uri: webViewUrl }}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onError={handleError}
        onHttpError={handleError}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        style={tw.style('flex-1 bg-transparent')}
        containerStyle={tw.style('bg-transparent')}
        androidLayerType="hardware"
        testID={DaimoPayModalSelectors.WEBVIEW}
      />
    </View>
  );
};

export default DaimoPayModal;
