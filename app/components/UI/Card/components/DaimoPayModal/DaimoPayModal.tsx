import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImageSourcePropType, Linking, StyleSheet, View } from 'react-native';
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
import BackgroundBridge from '../../../../../core/BackgroundBridge/BackgroundBridge';
import EntryScriptWeb3 from '../../../../../core/EntryScriptWeb3';
import { getRpcMethodMiddleware } from '../../../../../core/RPCMethods/RPCMethodMiddleware';
import { SPA_urlChangeListener } from '../../../../../util/browserScripts';
import { MAX_MESSAGE_LENGTH } from '../../../../../constants/dapp';
import Logger from '../../../../../util/Logger';
import { useCardSDK } from '../../sdk';

const POLLING_INTERVAL_MS = 5000;
const POLLING_TIMEOUT_MS = 10 * 60 * 1000;

export interface DaimoPayModalParams {
  payId: string;
  fromUpgrade?: boolean;
}

const baseStyles = StyleSheet.create({
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
  },
});

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

  const backgroundBridgeRef = useRef<BackgroundBridgeRef | null>(null);
  const urlRef = useRef<string>('');
  const titleRef = useRef<string>('Daimo Pay');
  const iconRef = useRef<ImageSourcePropType | undefined>(undefined);

  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { payId, fromUpgrade } = useParams<DaimoPayModalParams>();
  const tw = useTailwind();
  const [error, setError] = useState<string | null>(null);
  const [entryScriptWeb3, setEntryScriptWeb3] = useState<string>('');

  const { sdk: cardSDK } = useCardSDK();

  const webViewUrl = DaimoPayService.buildWebViewUrl(payId);
  const isProduction = DaimoPayService.isProduction();

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
        setEntryScriptWeb3('');
      }
    };
    loadEntryScript();
  }, []);

  useEffect(
    () => () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
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

      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      navigation.navigate(
        Routes.CARD.ORDER_COMPLETED as never,
        {
          paymentMethod: 'crypto',
          transactionHash: txHash,
          fromUpgrade,
        } as never,
      );
    },
    [trackEvent, createEventBuilder, navigation, fromUpgrade],
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

  const initializeBackgroundBridge = useCallback(
    (url: string) => {
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

  const startPolling = useCallback(() => {
    if (!isProduction || pollingIntervalRef.current) {
      return;
    }

    pollingStartTimeRef.current = Date.now();

    pollingIntervalRef.current = setInterval(async () => {
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
        const status = await DaimoPayService.pollPaymentStatus(payId, {
          cardSDK: cardSDK ?? undefined,
        });

        if (status.status === 'completed') {
          handlePaymentSuccess(status.transactionHash, status.chainId);
        } else if (status.status === 'failed') {
          handlePaymentBounced(status.errorMessage);
        }
      } catch {
        // Continue polling on error
      }
    }, POLLING_INTERVAL_MS);
  }, [
    isProduction,
    payId,
    handlePaymentSuccess,
    handlePaymentBounced,
    cardSDK,
  ]);

  const handleDaimoEvent = useCallback(
    (event: DaimoPayEvent) => {
      const eventType: DaimoPayEventType = event.type;

      Logger.log(`[DaimoPay Event] ${eventType}:`, JSON.stringify(event));

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
          startPolling();
          break;

        case 'paymentCompleted':
          Logger.log(
            '[DaimoPay] Payment completed with payload:',
            JSON.stringify(event.payload),
          );
          if (!isProduction) {
            handlePaymentSuccess(event.payload.txHash, event.payload.chainId);
          }
          break;

        case 'paymentBounced': {
          Logger.log(
            '[DaimoPay] Payment bounced with payload:',
            JSON.stringify(event.payload),
          );
          const errorMsg =
            event.payload?.errorMessage ||
            event.payload?.error ||
            event.payload?.reason;
          handlePaymentBounced(errorMsg);
          break;
        }
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

  const handleMessage = useCallback(
    (messageEvent: WebViewMessageEvent) => {
      const { data } = messageEvent.nativeEvent;

      try {
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

        if (dataParsed.source === 'daimo-pay-console') {
          const prefix = '[DaimoPay WebView]';
          switch (dataParsed.level) {
            case 'error':
            case 'warn':
            case 'info':
            case 'debug':
            case 'log':
            default:
              Logger.log(`${prefix} ${dataParsed.message}`);
              break;
          }
          return;
        }

        if (dataParsed.source === 'daimo-pay') {
          handleDaimoEvent(dataParsed as DaimoPayEvent);
          return;
        }

        if (dataParsed.name) {
          if (
            dataParsed.origin &&
            !DaimoPayService.isValidMessageOrigin(dataParsed.origin)
          ) {
            Logger.log(
              `DaimoPayModal: Message blocked from untrusted origin: ${dataParsed.origin}`,
            );
            return;
          }

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

  const handleShouldStartLoadWithRequest = useCallback(
    (request: { url: string }) => {
      if (DaimoPayService.shouldLoadInWebView(request.url)) {
        return true;
      }

      Linking.openURL(request.url);
      return false;
    },
    [],
  );

  const handleLoadEnd = useCallback(() => {
    const origin = new URL(webViewUrl).origin;
    initializeBackgroundBridge(origin);
  }, [webViewUrl, initializeBackgroundBridge]);

  const injectedJavaScriptForTransparency = `
    (function() {
      if (window.ethereum) {
        window.ethereum.isMetaMaskMobile = true;
        window.ethereum.isMetaMaskWallet = true;
        window.ethereum._metamask = window.ethereum._metamask || {};
        window.ethereum._metamask.isUnlocked = function() { return Promise.resolve(true); };
        
        if (!window.ethereum.connect) {
          window.ethereum.connect = function() {
            return window.ethereum.request({ method: 'eth_requestAccounts' });
          };
        }
      }
      
      setTimeout(function() {
        document.addEventListener('click', function(e) {
          if (window.ethereum && window.ethereum.selectedAddress) {
            return;
          }
          
          var target = e.target;
          var el = target;
          
          while (el && el !== document.body) {
            var text = (el.innerText || el.textContent || '').toLowerCase();
            if (text.includes('metamask') && !text.includes('another wallet') && !text.includes('other')) {
              if (window.ethereum && window.ethereum.request) {
                window.ethereum.request({ method: 'eth_requestAccounts' }).catch(function() {});
              }
              return;
            }
            el = el.parentElement;
          }
        }, true);
      }, 500);

      document.documentElement.style.backgroundColor = 'transparent';
      document.body.style.backgroundColor = 'transparent';
      
      var style = document.createElement('style');
      style.textContent = \`
        html, body {
          background: transparent !important;
          background-color: transparent !important;
        }
        [data-radix-portal] > div:first-child,
        [class*="backdrop"],
        [class*="Backdrop"],
        [class*="overlay"],
        [class*="Overlay"],
        .fixed.inset-0,
        div[style*="position: fixed"][style*="inset: 0"] {
          background: transparent !important;
          background-color: transparent !important;
        }
      \`;
      document.head.appendChild(style);
      
      var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === 1) {
              var el = node;
              if (el.matches && (
                el.matches('[class*="backdrop"]') ||
                el.matches('[class*="Backdrop"]') ||
                el.matches('[class*="overlay"]') ||
                el.matches('[class*="Overlay"]')
              )) {
                el.style.backgroundColor = 'transparent';
              }
            }
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    })();
    true;
  `;

  const handleError = useCallback(
    (syntheticEvent?: {
      nativeEvent?: { description?: string; code?: number };
    }) => {
      Logger.log(
        '[DaimoPay] WebView error:',
        JSON.stringify(syntheticEvent?.nativeEvent),
      );
      setError(strings('card.daimo_pay_modal.load_error'));
    },
    [],
  );

  const handleRetry = useCallback(() => {
    setError(null);
  }, []);

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
        injectedJavaScript={injectedJavaScriptForTransparency}
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
