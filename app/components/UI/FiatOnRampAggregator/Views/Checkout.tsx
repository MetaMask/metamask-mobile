import React, { useCallback, useEffect, useState } from 'react';
import { parseUrl } from 'query-string';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { View } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { QuoteResponse, CryptoCurrency, Order } from '@consensys/on-ramp-sdk';
import { baseStyles } from '../../../../styles/common';
import { useTheme } from '../../../../util/theme';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import { useFiatOnRampSDK, SDK } from '../sdk';
import { NETWORK_NATIVE_SYMBOL } from '../../../../constants/on-ramp';

import { addFiatOrder } from '../../../../reducers/fiatOrders';
import Engine from '../../../../core/Engine';
import { toLowerCaseEquals } from '../../../../util/general';
import { protectWalletModalVisible } from '../../../../actions/user';
import {
  processAggregatorOrder,
  aggregatorInitialFiatOrder,
} from '../orderProcessor/aggregator';
import NotificationManager from '../../../../core/NotificationManager';
import { FiatOrder, getNotificationDetails } from '../../FiatOrders';
import ScreenLayout from '../components/ScreenLayout';
import ErrorView from '../components/ErrorView';
import ErrorViewWithReporting from '../components/ErrorViewWithReporting';
import { strings } from '../../../../../locales/i18n';
import useAnalytics from '../hooks/useAnalytics';
import { hexToBN } from '../../../../util/number';

const CheckoutWebView = () => {
  const { selectedAddress, selectedChainId, sdkError, callbackBaseUrl } =
    useFiatOnRampSDK();
  const dispatch = useDispatch();
  const trackEvent = useAnalytics();
  const [error, setError] = useState('');
  const [key, setKey] = useState(0);
  const navigation = useNavigation();
  // @ts-expect-error useRoute params error
  const { params }: { params: QuoteResponse } = useRoute();
  const { colors } = useTheme();
  const accounts = useSelector(
    (state: any) =>
      state.engine.backgroundState.AccountTrackerController.accounts,
  );

  const uri = params?.buyURL;

  const handleCancelPress = useCallback(() => {
    trackEvent('ONRAMP_CANCELED', {
      location: 'Provider Webview',
      chain_id_destination: selectedChainId,
      provider_onramp: params.provider.name,
    });
  }, [params.provider.name, selectedChainId, trackEvent]);

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        { title: params.provider.name },
        colors,
        handleCancelPress,
      ),
    );
  }, [navigation, colors, params.provider.name, handleCancelPress]);

  const addTokenToTokensController = async (token: CryptoCurrency) => {
    if (!token) return;

    const { address, symbol, decimals, network } = token;
    const chainId = network?.chainId;

    if (
      Number(chainId) !== Number(selectedChainId) ||
      NETWORK_NATIVE_SYMBOL[chainId] === symbol
    ) {
      return;
    }

    // @ts-expect-error Engine context typing
    const { TokensController } = Engine.context;

    if (
      !TokensController.state.tokens.includes((t: any) =>
        toLowerCaseEquals(t.address, address),
      )
    ) {
      await TokensController.addToken(address, symbol, decimals);
    }
  };

  const handleAddFiatOrder = useCallback(
    (order) => {
      dispatch(addFiatOrder(order));
    },
    [dispatch],
  );

  const handleDispatchUserWalletProtection = useCallback(() => {
    dispatch(protectWalletModalVisible());
  }, [dispatch]);

  const handleNavigationStateChange = async (navState: WebViewNavigation) => {
    if (navState?.url.startsWith(callbackBaseUrl)) {
      try {
        const parsedUrl = parseUrl(navState?.url);
        if (Object.keys(parsedUrl.query).length === 0) {
          // There was no query params in the URL to parse
          // Most likely the user clicked the X in Wyre widget
          // @ts-expect-error navigation prop mismatch
          navigation.dangerouslyGetParent()?.pop();
          return;
        }
        const orders = await SDK.orders();
        const orderId = await orders.getOrderIdFromCallback(
          params?.provider.id,
          navState?.url,
        );

        if (!orderId) {
          throw new Error(
            `Order ID could not be retrieved. Callback was ${navState?.url}`,
          );
        }

        const transformedOrder = {
          ...(await processAggregatorOrder(
            aggregatorInitialFiatOrder({
              id: orderId,
              account: selectedAddress,
              network: selectedChainId,
            }),
          )),
          id: orderId,
          account: selectedAddress,
          network: selectedChainId,
        };

        // add the order to the redux global store
        handleAddFiatOrder(transformedOrder);
        // register the token automatically
        await addTokenToTokensController(
          (transformedOrder as any)?.data?.cryptoCurrency,
        );

        // prompt user to protect his/her wallet
        handleDispatchUserWalletProtection();
        // close the checkout webview
        // @ts-expect-error navigation prop mismatch
        navigation.dangerouslyGetParent()?.pop();
        NotificationManager.showSimpleNotification(
          getNotificationDetails(transformedOrder as any),
        );
        trackEvent('ONRAMP_PURCHASE_SUBMITTED', {
          provider_onramp: ((transformedOrder as FiatOrder)?.data as Order)
            ?.provider?.name,
          chain_id_destination: selectedChainId,
          is_apple_pay: false,
          has_zero_native_balance: accounts[selectedAddress]?.balance
            ? (hexToBN(accounts[selectedAddress].balance) as any)?.isZero?.()
            : undefined,
        });
      } catch (navStateError) {
        setError((navStateError as Error)?.message);
      }
    }
  };

  if (sdkError) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorViewWithReporting error={sdkError} />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView
            description={error}
            ctaOnPress={() => {
              setKey((prevKey) => prevKey + 1);
              setError('');
            }}
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (uri) {
    return (
      <View style={baseStyles.flexGrow}>
        <WebView
          key={key}
          source={{ uri }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            if (
              nativeEvent.url === uri ||
              nativeEvent.url.startsWith(callbackBaseUrl)
            ) {
              const webviewHttpError = strings(
                'fiat_on_ramp_aggregator.webview_received_error',
                { code: nativeEvent.statusCode },
              );
              setError(webviewHttpError);
            }
          }}
          allowInlineMediaPlayback
          enableApplePay
          mediaPlaybackRequiresUserAction={false}
          onNavigationStateChange={handleNavigationStateChange}
        />
      </View>
    );
  }
};

export default CheckoutWebView;
