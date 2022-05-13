import React, { useCallback, useEffect, useState } from 'react';
import { parseUrl } from 'query-string';
import { useDispatch } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { View } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { QuoteResponse, CryptoCurrency } from '@consensys/on-ramp-sdk';
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
  callbackBaseUrl,
  processAggregatorOrder,
  aggregatorInitialFiatOrder,
} from '../orderProcessor/aggregator';
import NotificationManager from '../../../../core/NotificationManager';
import { getNotificationDetails } from '../../FiatOrders';
import ScreenLayout from '../components/ScreenLayout';
import ErrorView from '../components/ErrorView';
import ErrorViewWithReporting from '../components/ErrorViewWithReporting';
import { strings } from '../../../../../locales/i18n';

const CheckoutWebView = () => {
  const { selectedAddress, selectedChainId, sdkError } = useFiatOnRampSDK();
  const dispatch = useDispatch();
  const [error, setError] = useState('');
  const [key, setKey] = useState(0);
  const navigation = useNavigation();
  // @ts-expect-error useRoute params error
  const { params }: { params: QuoteResponse } = useRoute();
  const { colors } = useTheme();
  const uri = params?.buyURL;
  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        { title: params.provider.name },
        colors,
      ),
    );
  }, [navigation, colors, params.provider.name]);

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
        const orders = await SDK.orders();
        const orderId = await orders.getOrderIdFromCallback(
          params?.provider.id,
          navState?.url,
        );
        const transformedOrder = await processAggregatorOrder(
          aggregatorInitialFiatOrder({
            id: orderId,
            account: selectedAddress,
            network: Number(selectedChainId),
          }),
        );
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
      } catch (navStateError) {
        const parsedUrl = parseUrl(navState?.url);
        if (Object.keys(parsedUrl.query).length === 0) {
          // @ts-expect-error navigation prop mismatch
          navigation.dangerouslyGetParent()?.pop();
        } else {
          setError((navStateError as Error)?.message);
        }
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
            if (nativeEvent.url === uri) {
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
