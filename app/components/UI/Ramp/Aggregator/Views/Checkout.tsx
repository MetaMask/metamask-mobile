import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useDispatch } from 'react-redux';
import { parseUrl } from 'query-string';
import { WebView, WebViewNavigation } from '@metamask/react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { Provider } from '@consensys/on-ramp-sdk';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import { baseStyles } from '../../../../../styles/common';
import { useTheme } from '../../../../../util/theme';
import { getFiatOnRampAggNavbar } from '../../../Navbar';
import { useRampSDK, SDK } from '../sdk';
import {
  addFiatCustomIdData,
  removeFiatCustomIdData,
} from '../../../../../reducers/fiatOrders';
import { CustomIdData } from '../../../../../reducers/fiatOrders/types';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import { aggregatorOrderToFiatOrder } from '../orderProcessor/aggregator';
import { createCustomOrderIdData } from '../orderProcessor/customOrderId';
import ScreenLayout from '../components/ScreenLayout';
import ErrorView from '../components/ErrorView';
import ErrorViewWithReporting from '../components/ErrorViewWithReporting';
import useAnalytics from '../../hooks/useAnalytics';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import useHandleSuccessfulOrder from '../hooks/useHandleSuccessfulOrder';

interface CheckoutParams {
  url: string;
  customOrderId?: string;
  provider: Provider;
}

export const createCheckoutNavDetails = createNavigationDetails<CheckoutParams>(
  Routes.RAMP.CHECKOUT,
);

const CheckoutWebView = () => {
  const { selectedAsset, selectedAddress, sdkError, callbackBaseUrl, isBuy } =
    useRampSDK();
  const dispatch = useDispatch();
  const trackEvent = useAnalytics();
  const [error, setError] = useState('');
  const [customIdData, setCustomIdData] = useState<CustomIdData>();
  const [isRedirectionHandled, setIsRedirectionHandled] = useState(false);
  const [key, setKey] = useState(0);
  const navigation = useNavigation();
  const params = useParams<CheckoutParams>();
  const { colors } = useTheme();
  const handleSuccessfulOrder = useHandleSuccessfulOrder();

  const { url: uri, customOrderId, provider } = params;

  const handleCancelPress = useCallback(() => {
    if (isBuy) {
      trackEvent('ONRAMP_CANCELED', {
        location: 'Provider Webview',
        chain_id_destination: selectedAsset?.network?.chainId || 'unknown',
        provider_onramp: provider.name,
      });
    } else {
      trackEvent('OFFRAMP_CANCELED', {
        location: 'Provider Webview',
        chain_id_source: selectedAsset?.network?.chainId || 'unknown',
        provider_offramp: provider.name,
      });
    }
  }, [isBuy, provider.name, selectedAsset?.network?.chainId, trackEvent]);

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(navigation, {}, colors, handleCancelPress),
    );
  }, [navigation, colors, handleCancelPress, provider.name]);

  useEffect(() => {
    if (!customOrderId || !selectedAsset?.network?.chainId) {
      return;
    }
    const customOrderIdData = createCustomOrderIdData(
      customOrderId,
      selectedAsset.network.chainId,
      selectedAddress,
      isBuy ? OrderOrderTypeEnum.Buy : OrderOrderTypeEnum.Sell,
    );
    setCustomIdData(customOrderIdData);
    dispatch(addFiatCustomIdData(customOrderIdData));
  }, [customOrderId, dispatch, isBuy, selectedAsset, selectedAddress]);

  const handleNavigationStateChange = async (navState: WebViewNavigation) => {
    if (
      !isRedirectionHandled &&
      navState.url.startsWith(callbackBaseUrl) &&
      navState.loading === false
    ) {
      setIsRedirectionHandled(true);
      try {
        const parsedUrl = parseUrl(navState.url);
        if (Object.keys(parsedUrl.query).length === 0) {
          // There was no query params in the URL to parse
          // Most likely the user clicked the X in Wyre widget
          // @ts-expect-error navigation prop mismatch
          navigation.dangerouslyGetParent()?.pop();
          return;
        }
        const orders = await SDK.orders();
        const getOrderFromCallbackMethod = isBuy
          ? 'getOrderFromCallback'
          : 'getSellOrderFromCallback';
        const order = await orders[getOrderFromCallbackMethod](
          provider.id,
          navState?.url,
          selectedAddress,
        );

        if (!order) {
          throw new Error(
            `Order could not be retrieved. Callback was ${navState?.url}`,
          );
        }

        if (customIdData) {
          dispatch(removeFiatCustomIdData(customIdData));
        }

        const transformedOrder = {
          ...aggregatorOrderToFiatOrder(order),
          account: selectedAddress,
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
