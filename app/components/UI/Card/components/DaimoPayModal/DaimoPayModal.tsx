import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImageSourcePropType, Linking, StyleSheet, View } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
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
import { useSelector } from 'react-redux';
import { isEqual } from 'lodash';
import { useParams } from '../../../../../util/navigation/navUtils';
import Logger from '../../../../../util/Logger';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardScreens } from '../../util/metrics';
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
import { useCardSDK } from '../../sdk';
import Engine from '../../../../../core/Engine';
import AppConstants from '../../../../../core/AppConstants';
import { getPermittedEvmAddressesByHostname } from '../../../../../core/Permissions';
import { selectPermissionControllerState } from '../../../../../selectors/snaps/permissionController';
import type { RootState } from '../../../../../reducers';
import { selectIsDaimoDemo } from '../../../../../core/redux/slices/card';
import { getDaimoEnvironment } from '../../util/getDaimoEnvironment';

const POLLING_INTERVAL_MS = 5000;
const POLLING_TIMEOUT_MS = 10 * 60 * 1000;
const { NOTIFICATION_NAMES } = AppConstants;

export interface DaimoPayModalParams {
  payId: string;
  fromUpgrade?: boolean;
  orderId: string;
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
  const { payId, fromUpgrade, orderId } = useParams<DaimoPayModalParams>();
  const tw = useTailwind();
  const [error, setError] = useState<string | null>(null);
  const [entryScriptWeb3, setEntryScriptWeb3] = useState<string>('');
  const isDaimoDemo = useSelector(selectIsDaimoDemo);
  const { sdk: cardSDK } = useCardSDK();

  const webViewUrl = DaimoPayService.buildWebViewUrl(payId);
  const daimoOrigin = new URL(webViewUrl).origin;

  const permittedAccountsList = useSelector((state: RootState) => {
    const permissionsControllerState = selectPermissionControllerState(state);
    return getPermittedEvmAddressesByHostname(
      permissionsControllerState,
      daimoOrigin,
    );
  }, isEqual);

  const notifyAllConnections = useCallback((payload: unknown) => {
    backgroundBridgeRef.current?.sendNotificationEip1193(payload);
  }, []);

  const sendActiveAccount = useCallback(() => {
    const permissionsControllerState =
      Engine.context.PermissionController.state;
    const permittedAccounts = getPermittedEvmAddressesByHostname(
      permissionsControllerState,
      daimoOrigin,
    );

    notifyAllConnections({
      method: NOTIFICATION_NAMES.accountsChanged,
      params: permittedAccounts,
    });
  }, [daimoOrigin, notifyAllConnections]);

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
      createEventBuilder(MetaMetricsEvents.CARD_METAL_CHECKOUT_USER_CANCELED)
        .addProperties({
          screen: CardScreens.DAIMO_PAY,
        })
        .build(),
    );
    navigation.goBack();
  }, [trackEvent, createEventBuilder, navigation]);

  const handlePaymentSuccess = useCallback(
    (txHash?: string, chainId?: number) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_METAL_CHECKOUT_COMPLETED)
          .addProperties({
            screen: CardScreens.DAIMO_PAY,
            chain_id: chainId,
          })
          .build(),
      );

      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      const parentNavigator = navigation.dangerouslyGetParent();
      if (parentNavigator) {
        parentNavigator.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: Routes.CARD.HOME,
                state: {
                  index: 1,
                  routes: [
                    { name: Routes.CARD.HOME },
                    {
                      name: Routes.CARD.ORDER_COMPLETED,
                      params: {
                        paymentMethod: 'crypto',
                        transactionHash: txHash,
                        fromUpgrade,
                      },
                    },
                  ],
                },
              },
            ],
          }),
        );
      } else {
        navigation.navigate(
          Routes.CARD.ORDER_COMPLETED as never,
          {
            paymentMethod: 'crypto',
            transactionHash: txHash,
            fromUpgrade,
          } as never,
        );
      }
    },
    [trackEvent, createEventBuilder, navigation, fromUpgrade],
  );

  const handlePaymentBounced = useCallback(
    (errorMessage?: string) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_METAL_CHECKOUT_FAILED)
          .addProperties({
            screen: CardScreens.DAIMO_PAY,
            error: errorMessage,
          })
          .build(),
      );

      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

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
              tabId: '',
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
    if (
      getDaimoEnvironment(isDaimoDemo) !== 'production' ||
      pollingIntervalRef.current
    ) {
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
        const status = await DaimoPayService.pollPaymentStatus(orderId, {
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
    isDaimoDemo,
    orderId,
    handlePaymentSuccess,
    handlePaymentBounced,
    cardSDK,
  ]);

  const handleDaimoEvent = useCallback(
    (event: DaimoPayEvent) => {
      const eventType: DaimoPayEventType = event.type;

      switch (eventType) {
        case 'modalOpened':
          trackEvent(
            createEventBuilder(MetaMetricsEvents.CARD_METAL_CHECKOUT_VIEWED)
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
            createEventBuilder(MetaMetricsEvents.CARD_METAL_CHECKOUT_STARTED)
              .addProperties({
                screen: CardScreens.DAIMO_PAY,
              })
              .build(),
          );
          startPolling();
          break;

        case 'paymentCompleted':
          // In demo mode, navigate immediately since there's no backend to poll.
          // In production, let polling verify the order status since the WebView
          // fires this when transaction is submitted, but we need to wait for
          // the backend to confirm the order is actually completed.
          if (getDaimoEnvironment(isDaimoDemo) === 'demo') {
            handlePaymentSuccess(event.payload.txHash, event.payload.chainId);
          }
          break;

        case 'paymentBounced': {
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
      isDaimoDemo,
    ],
  );

  const handleMessage = useCallback(
    (messageEvent: WebViewMessageEvent) => {
      const { data } = messageEvent.nativeEvent;

      try {
        if (data.length > MAX_MESSAGE_LENGTH) {
          return;
        }

        const dataParsed = typeof data === 'string' ? JSON.parse(data) : data;

        if (!dataParsed || typeof dataParsed !== 'object') {
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

    setTimeout(() => {
      sendActiveAccount();
    }, 100);
  }, [webViewUrl, initializeBackgroundBridge, sendActiveAccount]);

  useEffect(() => {
    if (backgroundBridgeRef.current) {
      sendActiveAccount();
    }
  }, [sendActiveAccount, permittedAccountsList]);

  const injectedJavaScriptForTransparency = `
    (function() {
      // Ensure window.ethereum has the properties wagmi expects
      if (window.ethereum) {
        // These flags help wagmi identify the provider
        window.ethereum.isMetaMask = true;
        window.ethereum.isMetaMaskMobile = true;
        
        // Ensure _metamask namespace exists with required methods
        window.ethereum._metamask = window.ethereum._metamask || {};
        if (!window.ethereum._metamask.isUnlocked) {
          window.ethereum._metamask.isUnlocked = function() { 
            return Promise.resolve(true); 
          };
        }
        
        // Add connect method if missing
        if (!window.ethereum.connect) {
          window.ethereum.connect = function() {
            return window.ethereum.request({ method: 'eth_requestAccounts' });
          };
        }
        
        // Click interceptor to bypass wagmi's broken connector validation
        // and directly trigger eth_requestAccounts
        document.addEventListener('click', function(e) {
          var target = e.target;
          
          // Only process clicks on actual DOM elements within the document body
          if (!target || !document.body.contains(target)) {
            return;
          }
          
          var el = target;
          var foundWalletButton = null;
          
          // Walk up the DOM tree to find if this is a MetaMask wallet button
          // Look for max 5 levels to avoid matching large containers
          var depth = 0;
          while (el && el !== document.body && depth < 5) {
            var text = (el.innerText || el.textContent || '').toLowerCase().trim();
            
            // Check if this looks like a wallet button:
            // 1. Contains "metamask" text
            // 2. Is short text (wallet name only, not a container)
            // 3. Is a clickable element (button, has role, or has cursor pointer)
            var isClickable = el.tagName === 'BUTTON' || 
                              el.getAttribute('role') === 'button' ||
                              el.tagName === 'A' ||
                              (el.onclick !== null) ||
                              (window.getComputedStyle && window.getComputedStyle(el).cursor === 'pointer');
            
            var isMetaMaskText = text === 'metamask' || 
                                 (text.includes('metamask') && text.length < 30);
            
            if (isMetaMaskText && isClickable) {
              foundWalletButton = el;
              break;
            }
            
            el = el.parentElement;
            depth++;
          }
          
          if (foundWalletButton) {
            // Prevent the default wagmi connector action
            e.preventDefault();
            e.stopPropagation();
            
            // Directly call eth_requestAccounts
            if (window.ethereum && window.ethereum.request) {
              window.ethereum.request({ method: 'eth_requestAccounts' });
            }
          }
        }, true); // Use capture phase to intercept before wagmi
      }

      // Transparency styles
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

  const handleError = useCallback(() => {
    setError(strings('card.daimo_pay_modal.load_error'));
  }, []);

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
