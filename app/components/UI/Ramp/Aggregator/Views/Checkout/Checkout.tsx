import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { parseUrl } from 'query-string';
import { WebView, WebViewNavigation } from '@metamask/react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { Provider } from '@consensys/on-ramp-sdk';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import { useTheme } from '../../../../../../util/theme';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { useRampSDK, SDK } from '../../sdk';
import {
  addFiatCustomIdData,
  removeFiatCustomIdData,
} from '../../../../../../reducers/fiatOrders';
import { CustomIdData } from '../../../../../../reducers/fiatOrders/types';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import { aggregatorOrderToFiatOrder } from '../../orderProcessor/aggregator';
import { createCustomOrderIdData } from '../../orderProcessor/customOrderId';
import ScreenLayout from '../../components/ScreenLayout';
import ErrorView from '../../components/ErrorView';
import ErrorViewWithReporting from '../../components/ErrorViewWithReporting';
import useAnalytics from '../../../hooks/useAnalytics';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import useHandleSuccessfulOrder from '../../hooks/useHandleSuccessfulOrder';
import Logger from '../../../../../../util/Logger';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './Checkout.styles';
import Device from '../../../../../../util/device';

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
  const sheetRef = useRef<BottomSheetRef>(null);
  const dispatch = useDispatch();
  const trackEvent = useAnalytics();
  const [error, setError] = useState('');
  const [customIdData, setCustomIdData] = useState<CustomIdData>();
  const [isRedirectionHandled, setIsRedirectionHandled] = useState(false);
  const [key, setKey] = useState(0);
  const navigation = useNavigation();
  const params = useParams<CheckoutParams>();
  const theme = useTheme();
  const handleSuccessfulOrder = useHandleSuccessfulOrder();

  const { styles } = useStyles(styleSheet, {});

  const { url: uri, customOrderId, provider } = params;

  const handleCancelPress = useCallback(() => {
    const chainId = selectedAsset?.network?.chainId || '';
    if (isBuy) {
      trackEvent('ONRAMP_CANCELED', {
        location: 'Provider Webview',
        chain_id_destination: chainId,
        provider_onramp: provider.name,
      });
    } else {
      trackEvent('OFFRAMP_CANCELED', {
        location: 'Provider Webview',
        chain_id_source: chainId,
        provider_offramp: provider.name,
      });
    }
  }, [isBuy, provider.name, selectedAsset?.network?.chainId, trackEvent]);

  const handleClosePress = useCallback(() => {
    handleCancelPress();
    sheetRef.current?.onCloseBottomSheet();
  }, [handleCancelPress]);

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: provider.name },
        theme,
        handleCancelPress,
      ),
    );
  }, [navigation, theme, handleCancelPress, provider.name]);

  useEffect(() => {
    if (
      !customOrderId ||
      !selectedAsset?.network?.chainId ||
      !selectedAddress
    ) {
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
          navigation.getParent()?.pop();
          return;
        }
        if (!selectedAddress) {
          Logger.error(new Error('No address available for selected asset'));
          setError(
            strings(
              'fiat_on_ramp_aggregator.webview_error_no_address_provided',
            ),
          );
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
          const noOrderError = new Error(
            `Order could not be retrieved. Callback was ${navState?.url}`,
          );
          Logger.error(noOrderError);
          throw noOrderError;
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
      <BottomSheet
        ref={sheetRef}
        shouldNavigateBack
        isFullscreen
        keyboardAvoidingViewEnabled={false}
      >
        <BottomSheetHeader
          endAccessory={
            <ButtonIcon
              iconName={IconName.Close}
              size={ButtonIconSizes.Lg}
              iconColor={IconColor.Default}
              testID="checkout-close-button"
              onPress={handleClosePress}
            />
          }
          style={styles.headerWithoutPadding}
        />
        <ScreenLayout>
          <ScreenLayout.Body>
            <ErrorViewWithReporting
              error={sdkError}
              location={'Provider Webview'}
            />
          </ScreenLayout.Body>
        </ScreenLayout>
      </BottomSheet>
    );
  }

  if (error) {
    return (
      <BottomSheet
        ref={sheetRef}
        shouldNavigateBack
        isFullscreen
        keyboardAvoidingViewEnabled={false}
      >
        <BottomSheetHeader
          endAccessory={
            <ButtonIcon
              iconName={IconName.Close}
              size={ButtonIconSizes.Lg}
              iconColor={IconColor.Default}
              testID="checkout-close-button"
              onPress={handleClosePress}
            />
          }
          style={styles.headerWithoutPadding}
        />

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
      </BottomSheet>
    );
  }

  if (uri) {
    return (
      <BottomSheet
        ref={sheetRef}
        shouldNavigateBack
        isFullscreen
        isInteractable={!Device.isAndroid()}
        keyboardAvoidingViewEnabled={false}
      >
        <BottomSheetHeader
          endAccessory={
            <ButtonIcon
              iconName={IconName.Close}
              size={ButtonIconSizes.Lg}
              iconColor={IconColor.Default}
              testID="checkout-close-button"
              onPress={handleClosePress}
            />
          }
          style={styles.headerWithoutPadding}
        />
        <WebView
          key={key}
          style={styles.webview}
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
          paymentRequestEnabled
          mediaPlaybackRequiresUserAction={false}
          onNavigationStateChange={handleNavigationStateChange}
          userAgent={provider?.features?.buy?.userAgent ?? undefined}
          testID="checkout-webview"
        />
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      isFullscreen
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader
        endAccessory={
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSizes.Lg}
            iconColor={IconColor.Default}
            testID="checkout-close-button"
            onPress={handleClosePress}
          />
        }
        style={styles.headerWithoutPadding}
      />
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView
            description={strings(
              'fiat_on_ramp_aggregator.webview_no_url_provided',
            )}
            location={'Provider Webview'}
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    </BottomSheet>
  );
};

export default CheckoutWebView;
