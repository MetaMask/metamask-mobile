/**
 * Meld Checkout — In-app WebView that opens the provider's payment UI.
 *
 * Replaces the external browser launch from the PoC.
 * Mirrors Aggregator/Views/Checkout/Checkout.tsx but uses Meld's
 * widget session URL and parses callback params directly.
 */

import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { WebView, WebViewNavigation } from '@metamask/react-native-webview';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';

import { useMeldContext } from '../../MeldProvider';
import { addFiatOrder } from '../../../../../../reducers/fiatOrders';
import NotificationManager from '../../../../../../core/NotificationManager';
import { getNotificationDetails } from '../../../Aggregator/utils';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../../constants/on-ramp';
import { FiatOrder } from '../../../../../../reducers/fiatOrders/types';
import { selectChainId } from '../../../../../../selectors/networkController';
import { MeldQuote, MeldWidgetSession } from '../../types';
import Logger from '../../../../../../util/Logger';

// The callback URL the provider redirects to after checkout
const CALLBACK_BASE_URL =
  'https://on-ramp-content.uat-api.cx.metamask.io/regions/fake-callback';

interface MeldCheckoutRouteParams {
  [key: string]: {
    widgetUrl: string;
    session: MeldWidgetSession;
    quote: MeldQuote;
  };
}

/**
 * Parse the callback URL query parameters into an order-like object.
 */
function parseCallbackParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const queryString = url.split('?')[1];
    if (queryString) {
      queryString.split('&').forEach((pair) => {
        const [key, value] = pair.split('=');
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      });
    }
  } catch (e) {
    Logger.error(e as Error, '[MeldCheckout] Failed to parse callback URL');
  }
  return params;
}

/**
 * Convert Meld checkout callback into a FiatOrder for Redux.
 */
function createFiatOrderFromCallback(
  callbackParams: Record<string, string>,
  quote: MeldQuote,
  session: MeldWidgetSession,
  walletAddress: string,
  chainId: string,
): FiatOrder {
  const orderId =
    callbackParams.orderId || callbackParams.partnerOrderId || session.id;

  const status = callbackParams.status?.toUpperCase();
  let state: FIAT_ORDER_STATES;
  switch (status) {
    case 'COMPLETED':
    case 'SETTLED':
      state = FIAT_ORDER_STATES.COMPLETED;
      break;
    case 'FAILED':
      state = FIAT_ORDER_STATES.FAILED;
      break;
    case 'CANCELLED':
      state = FIAT_ORDER_STATES.CANCELLED;
      break;
    default:
      state = FIAT_ORDER_STATES.PENDING;
  }

  return {
    id: orderId,
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    createdAt: Date.now(),
    amount: callbackParams.fiatAmount || String(quote.sourceAmount),
    fee: callbackParams.totalFeeInFiat || String(quote.totalFee),
    cryptoAmount:
      callbackParams.cryptoAmount || String(quote.destinationAmount),
    currency: callbackParams.fiatCurrency || quote.sourceCurrencyCode,
    cryptocurrency:
      callbackParams.cryptoCurrency || quote.destinationCurrencyCode,
    state,
    account: walletAddress,
    network: chainId,
    excludeFromPurchases: false,
    orderType: quote.transactionType === 'CRYPTO_SELL' ? 'SELL' : 'BUY',
    data: {
      // Store Meld-specific data for order polling
      provider: {
        name: quote.serviceProvider,
        id: quote.serviceProvider.toLowerCase(),
      },
      status: state,
      createdAt: new Date().toISOString(),
      fiatAmount: Number(callbackParams.fiatAmount || quote.sourceAmount),
      fiatCurrency: {
        symbol: callbackParams.fiatCurrency || quote.sourceCurrencyCode,
        denomSymbol: '$',
      },
      cryptoAmount: Number(
        callbackParams.cryptoAmount || quote.destinationAmount,
      ),
      cryptoCurrency: {
        symbol: callbackParams.cryptoCurrency || quote.destinationCurrencyCode,
      },
      // Meld session info for polling
      meldSessionId: session.id,
      meldCustomerId: session.customerId,
      meldExternalSessionId: session.externalSessionId,
    } as FiatOrder['data'],
  };
}

const MeldCheckout: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<MeldCheckoutRouteParams, string>>();
  const dispatch = useDispatch();
  const chainId = useSelector(selectChainId);

  const { walletAddress } = useMeldContext();
  const { widgetUrl, session, quote } = route.params;

  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirectionHandled, setIsRedirectionHandled] = useState(false);

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      // Intercept the callback URL
      if (
        !isRedirectionHandled &&
        navState.url.startsWith(CALLBACK_BASE_URL) &&
        !navState.loading
      ) {
        setIsRedirectionHandled(true);

        const callbackParams = parseCallbackParams(navState.url);
        Logger.log(
          '[MeldCheckout] Callback intercepted:',
          JSON.stringify(callbackParams),
        );

        // Create FiatOrder and dispatch to Redux
        const fiatOrder = createFiatOrderFromCallback(
          callbackParams,
          quote,
          session,
          walletAddress,
          chainId,
        );

        dispatch(addFiatOrder(fiatOrder));

        // Show notification (same pattern as aggregator)
        const notificationDetails = getNotificationDetails(fiatOrder);
        if (notificationDetails) {
          NotificationManager.showSimpleNotification(notificationDetails);
        }

        Logger.log(
          '[MeldCheckout] Order created:',
          fiatOrder.id,
          fiatOrder.state,
        );

        // Pop the entire Meld stack from the parent navigator
        // This is the same pattern as Aggregator/Views/Checkout/Checkout.tsx
        // @ts-expect-error navigation prop mismatch
        navigation.dangerouslyGetParent()?.dangerouslyGetParent()?.pop();
      }
    },
    [
      isRedirectionHandled,
      quote,
      session,
      walletAddress,
      chainId,
      dispatch,
      navigation,
    ],
  );

  return (
    <Box twClassName="flex-1 bg-default">
      {isLoading && (
        <Box twClassName="absolute inset-0 z-10 items-center justify-center bg-default">
          <ActivityIndicator size="large" />
          <Text variant={TextVariant.BodyMd} twClassName="mt-4 text-muted">
            Loading {quote.serviceProvider} checkout...
          </Text>
        </Box>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: widgetUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadEnd={() => setIsLoading(false)}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        originWhitelist={['https://*', 'http://*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
      />
    </Box>
  );
};

export default MeldCheckout;
