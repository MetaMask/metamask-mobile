import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ImageSourcePropType,
  Linking,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Text,
  TextVariant,
  FontWeight,
  Button,
  ButtonVariant,
  ButtonSize,
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
// EIP-1193 Provider injection
import BackgroundBridge from '../../../../../core/BackgroundBridge/BackgroundBridge';
import EntryScriptWeb3 from '../../../../../core/EntryScriptWeb3';
import { getRpcMethodMiddleware } from '../../../../../core/RPCMethods/RPCMethodMiddleware';
import { SPA_urlChangeListener } from '../../../../../util/browserScripts';
import { MAX_MESSAGE_LENGTH } from '../../../../../constants/dapp';
import Logger from '../../../../../util/Logger';

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

// Type for BackgroundBridge reference
interface BackgroundBridgeRef {
  url: string;
  sendNotificationEip1193: (payload: unknown) => void;
  onDisconnect: () => void;
  onMessage: (message: Record<string, unknown>) => void;
}

const DaimoPayModal: React.FC = () => {
  const webViewRef = useRef<WebView>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const pollingStartTimeRef = useRef<number | null>(null);

  // EIP-1193 Provider refs
  const backgroundBridgeRef = useRef<BackgroundBridgeRef | null>(null);
  const urlRef = useRef<string>('');
  const titleRef = useRef<string>('Daimo Pay');
  const iconRef = useRef<ImageSourcePropType | undefined>(undefined);

  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { payId } = useParams<DaimoPayModalParams>();
  const tw = useTailwind();
  const [error, setError] = useState<string | null>(null);
  const [entryScriptWeb3, setEntryScriptWeb3] = useState<string | null>(null);

  const webViewUrl = DaimoPayService.buildWebViewUrl(payId);
  const isProduction = DaimoPayService.isProduction();

  // Load the EIP-1193 provider injection script
  useEffect(() => {
    const loadEntryScript = async () => {
      try {
        const script = await EntryScriptWeb3.get();
        setEntryScriptWeb3(script + SPA_urlChangeListener);
      } catch (err) {
        Logger.error(
          err as Error,
          'DaimoPayModal: Failed to load entry script',
        );
        // Continue without provider injection - Daimo will fall back to other payment methods
        // Set empty string to allow WebView to render
        setEntryScriptWeb3('');
      }
    };
    loadEntryScript();
  }, []);

  // Clean up polling and BackgroundBridge on unmount
  useEffect(
    () => () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      // Disconnect BackgroundBridge to prevent memory leaks
      backgroundBridgeRef.current?.onDisconnect();
      backgroundBridgeRef.current = null;
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

  /**
   * Initialize the BackgroundBridge for EIP-1193 provider communication
   * This enables the Daimo WebView to detect window.ethereum and use MetaMask
   */
  const initializeBackgroundBridge = useCallback(
    (url: string) => {
      // Disconnect any existing bridge first
      backgroundBridgeRef.current?.onDisconnect();
      backgroundBridgeRef.current = null;

      urlRef.current = url;

      try {
        const origin = new URL(url).origin;

        // @ts-expect-error - BackgroundBridge is a JS file without proper types
        const newBridge = new BackgroundBridge({
          webview: webViewRef,
          url,
          getRpcMethodMiddleware: ({
            getProviderState,
          }: {
            getProviderState: () => void;
          }) =>
            getRpcMethodMiddleware({
              hostname: origin,
              getProviderState,
              navigation,
              url: urlRef,
              title: titleRef,
              icon: iconRef,
              isHomepage: () => false,
              fromHomepage: { current: false },
              toggleUrlModal: () => null,
              tabId: '',
              injectHomePageScripts: () => null,
              isWalletConnect: false,
              isMMSDK: false,
              analytics: {},
            }),
          isMainFrame: true,
        });

        backgroundBridgeRef.current = newBridge;
      } catch (err) {
        Logger.error(
          err as Error,
          'DaimoPayModal: Failed to initialize BackgroundBridge',
        );
      }
    },
    [navigation],
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

  /**
   * Handle WebView messages - routes to appropriate handler based on message type
   * - Daimo events (source: 'daimo-pay') → handleDaimoEvent
   * - Provider messages (has 'name' property) → BackgroundBridge
   */
  const handleMessage = useCallback(
    (messageEvent: WebViewMessageEvent) => {
      const { data } = messageEvent.nativeEvent;

      try {
        // Security: Enforce message size limit to prevent DoS
        if (data.length > MAX_MESSAGE_LENGTH) {
          Logger.log(
            `DaimoPayModal: Message exceeded size limit (${data.length} bytes), dropping`,
          );
          return;
        }

        const dataParsed = typeof data === 'string' ? JSON.parse(data) : data;

        if (!dataParsed || typeof dataParsed !== 'object') {
          return;
        }

        // Check if it's a Daimo-specific event
        if (dataParsed.source === 'daimo-pay') {
          handleDaimoEvent(dataParsed as DaimoPayEvent);
          return;
        }

        // Check if it's a provider message (has 'name' property from MobilePortStream)
        if (dataParsed.name) {
          // Security: Validate message origin before forwarding to BackgroundBridge
          if (
            dataParsed.origin &&
            !DaimoPayService.isValidMessageOrigin(dataParsed.origin)
          ) {
            Logger.log(
              `DaimoPayModal: Message blocked from untrusted origin: ${dataParsed.origin}`,
            );
            return;
          }

          // Forward to BackgroundBridge for RPC processing
          backgroundBridgeRef.current?.onMessage(dataParsed);
        }
      } catch (err) {
        Logger.error(
          err as Error,
          `DaimoPayModal: Error parsing WebView message`,
        );
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

  /**
   * Initialize BackgroundBridge when WebView finishes loading
   */
  const handleLoadEnd = useCallback(() => {
    initializeBackgroundBridge(webViewUrl);
  }, [webViewUrl, initializeBackgroundBridge]);

  const handleError = useCallback(() => {
    setError(strings('card.daimo_pay_modal.load_error'));
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
  }, []);

  // Show loading indicator while entry script loads
  if (entryScriptWeb3 === null) {
    return (
      <View
        style={[baseStyles.absoluteFill, tw.style('bg-default')]}
        testID={DaimoPayModalSelectors.CONTAINER}
      >
        <View style={tw.style('flex-1 justify-center items-center')}>
          <ActivityIndicator
            size="large"
            testID={DaimoPayModalSelectors.LOADING_INDICATOR}
          />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[baseStyles.absoluteFill, tw.style('bg-default')]}
        testID={DaimoPayModalSelectors.CONTAINER}
      >
        <View style={tw.style('flex-1 justify-center items-center p-4 gap-4')}>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            twClassName="text-error-default text-center"
            testID={DaimoPayModalSelectors.ERROR_TEXT}
          >
            {error}
          </Text>
          <View style={tw.style('flex-row gap-3')}>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={handleClose}
              testID={DaimoPayModalSelectors.CLOSE_BUTTON}
            >
              {strings('card.daimo_pay_modal.close')}
            </Button>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Md}
              onPress={handleRetry}
              testID={DaimoPayModalSelectors.RETRY_BUTTON}
            >
              {strings('card.daimo_pay_modal.try_again')}
            </Button>
          </View>
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
        onLoadEnd={handleLoadEnd}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onError={handleError}
        onHttpError={handleError}
        injectedJavaScriptBeforeContentLoaded={entryScriptWeb3}
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
