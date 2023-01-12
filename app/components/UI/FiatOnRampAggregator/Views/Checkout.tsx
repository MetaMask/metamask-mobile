import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { parseUrl } from 'query-string';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { CryptoCurrency, Order, Provider } from '@consensys/on-ramp-sdk';
import { baseStyles } from '../../../../styles/common';
import { useTheme } from '../../../../util/theme';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import { NATIVE_ADDRESS } from '../../../../constants/on-ramp';
import { useFiatOnRampSDK, SDK } from '../sdk';
import {
  addFiatCustomIdData,
  addFiatOrder,
  FiatOrder,
  removeFiatCustomIdData,
} from '../../../../reducers/fiatOrders';
import { CustomIdData } from '../../../../reducers/fiatOrders/types';
import Engine from '../../../../core/Engine';
import { toLowerCaseEquals } from '../../../../util/general';
import {
  createNavigationDetails,
  useParams,
} from '../../../../util/navigation/navUtils';
import { hexToBN } from '../../../../util/number';
import { protectWalletModalVisible } from '../../../../actions/user';
import {
  processAggregatorOrder,
  aggregatorInitialFiatOrder,
} from '../orderProcessor/aggregator';
import { createCustomOrderIdData } from '../orderProcessor/customOrderId';
import { getNotificationDetails } from '..';
import NotificationManager from '../../../../core/NotificationManager';
import ScreenLayout from '../components/ScreenLayout';
import ErrorView from '../components/ErrorView';
import ErrorViewWithReporting from '../components/ErrorViewWithReporting';
import useAnalytics from '../hooks/useAnalytics';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';

interface CheckoutParams {
  url: string;
  customOrderId?: string;
  provider: Provider;
}

export const createCheckoutNavDetails = createNavigationDetails<CheckoutParams>(
  Routes.FIAT_ON_RAMP_AGGREGATOR.CHECKOUT,
);

const CheckoutWebView = () => {
  const { selectedAddress, selectedChainId, sdkError, callbackBaseUrl } =
    useFiatOnRampSDK();
  const dispatch = useDispatch();
  const trackEvent = useAnalytics();
  const [error, setError] = useState('');
  const [customIdData, setCustomIdData] = useState<CustomIdData>();
  const [isRedirectionHandled, setIsRedirectionHandled] = useState(false);
  const [key, setKey] = useState(0);
  const navigation = useNavigation();
  const params = useParams<CheckoutParams>();
  const { colors } = useTheme();
  const accounts = useSelector(
    (state: any) =>
      state.engine.backgroundState.AccountTrackerController.accounts,
  );

  const { url: uri, customOrderId, provider } = params;

  const handleCancelPress = useCallback(() => {
    trackEvent('ONRAMP_CANCELED', {
      location: 'Provider Webview',
      chain_id_destination: selectedChainId,
      provider_onramp: provider.name,
    });
  }, [provider.name, selectedChainId, trackEvent]);

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        { title: provider.name },
        colors,
        handleCancelPress,
      ),
    );
  }, [navigation, colors, handleCancelPress, provider.name]);

  useEffect(() => {
    if (!customOrderId) {
      return;
    }
    const customOrderIdData = createCustomOrderIdData(
      customOrderId,
      selectedChainId,
      selectedAddress,
    );
    setCustomIdData(customOrderIdData);
    dispatch(addFiatCustomIdData(customOrderIdData));
  }, [customOrderId, dispatch, selectedAddress, selectedChainId]);

  const addTokenToTokensController = useCallback(
    async (token: CryptoCurrency) => {
      if (!token) return;

      const { address, symbol, decimals, network } = token;
      const chainId = network?.chainId;

      if (
        Number(chainId) !== Number(selectedChainId) ||
        address === NATIVE_ADDRESS
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
    },
    [selectedChainId],
  );

  const handleAddFiatOrder = useCallback(
    (order) => {
      dispatch(addFiatOrder(order));
    },
    [dispatch],
  );

  const handleDispatchUserWalletProtection = useCallback(() => {
    dispatch(protectWalletModalVisible());
  }, [dispatch]);

  const handleSuccessfulOrder = useCallback(
    async (order) => {
      // add the order to the redux global store
      handleAddFiatOrder(order);
      // register the token automatically
      await addTokenToTokensController((order as any)?.data?.cryptoCurrency);

      // prompt user to protect his/her wallet
      handleDispatchUserWalletProtection();
      // close the checkout webview
      // @ts-expect-error navigation prop mismatch
      navigation.dangerouslyGetParent()?.pop();
      NotificationManager.showSimpleNotification(
        getNotificationDetails(order as any),
      );
      trackEvent('ONRAMP_PURCHASE_SUBMITTED', {
        provider_onramp: ((order as FiatOrder)?.data as Order)?.provider?.name,
        payment_method_id: ((order as FiatOrder)?.data as Order)?.paymentMethod
          ?.id,
        currency_source: ((order as FiatOrder)?.data as Order)?.fiatCurrency
          .symbol,
        currency_destination: ((order as FiatOrder)?.data as Order)
          ?.cryptoCurrency.symbol,
        chain_id_destination: selectedChainId,
        order_type: (order as FiatOrder)?.orderType,
        is_apple_pay: false,
        has_zero_native_balance: accounts[selectedAddress]?.balance
          ? (hexToBN(accounts[selectedAddress].balance) as any)?.isZero?.()
          : undefined,
      });
    },
    [
      accounts,
      addTokenToTokensController,
      handleAddFiatOrder,
      handleDispatchUserWalletProtection,
      navigation,
      selectedAddress,
      selectedChainId,
      trackEvent,
    ],
  );

  const handleNavigationStateChange = async (navState: WebViewNavigation) => {
    if (
      !isRedirectionHandled &&
      navState?.url.startsWith(callbackBaseUrl) &&
      navState.loading === false
    ) {
      setIsRedirectionHandled(true);
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
          provider.id,
          navState?.url,
        );

        if (!orderId) {
          throw new Error(
            `Order ID could not be retrieved. Callback was ${navState?.url}`,
          );
        }

        if (customIdData) {
          dispatch(removeFiatCustomIdData(customIdData));
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

        handleSuccessfulOrder(transformedOrder);
      } catch (navStateError) {
        setError((navStateError as Error)?.message);
      }
    }
  };

  if (sdkError) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorViewWithReporting
            error={sdkError}
            location={'Provider Webview'}
          />
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
              setIsRedirectionHandled(false);
            }}
            location={'Provider Webview'}
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
          allowsInlineMediaPlayback
          enableApplePay
          mediaPlaybackRequiresUserAction={false}
          onNavigationStateChange={handleNavigationStateChange}
          userAgent={provider?.features?.buy?.userAgent ?? undefined}
        />
      </View>
    );
  }

  return null;
};

export default CheckoutWebView;
