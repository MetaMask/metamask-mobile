import React, { useCallback, useEffect, useState } from 'react';
import { WebView } from '@metamask/react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { strings } from '../../../../../../../locales/i18n';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './ProviderWebview.styles';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { createOrderProcessingNavDetails } from '../OrderProcessing/OrderProcessing';
import ErrorView from '../../../Aggregator/components/ErrorView';
import { depositOrderToFiatOrder } from '../../orderProcessor';
import { addFiatOrder, FiatOrder } from '../../../../../../reducers/fiatOrders';
import NotificationManager from '../../../../../../core/NotificationManager';
import {
  getNotificationDetails,
  stateHasOrder,
} from '../../../Aggregator/utils';
import useThunkDispatch from '../../../../../hooks/useThunkDispatch';

export interface ProviderWebviewParams {
  quote: BuyQuote;
}

export const createProviderWebviewNavDetails =
  createNavigationDetails<ProviderWebviewParams>(
    Routes.DEPOSIT.PROVIDER_WEBVIEW,
  );

const ProviderWebview = () => {
  const [webviewError, setWebviewError] = useState('');
  const [key, setKey] = useState(0);
  const navigation = useNavigation();
  const dispatchThunk = useThunkDispatch();
  const { quote } = useParams<ProviderWebviewParams>();
  const { theme } = useStyles(styleSheet, {});
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const [{ error: ottError, data: ottResponse }] =
    useDepositSdkMethod('requestOtt');

  const [{ error: paymentUrlError, data: paymentUrl }, generatePaymentUrl] =
    useDepositSdkMethod({
      method: 'generatePaymentWidgetUrl',
      onMount: false,
    });

  const [{ error: orderError }, getOrder] = useDepositSdkMethod({
    method: 'getOrder',
    onMount: false,
  });

  const handleSuccessfulOrder = useCallback(
    async (order: FiatOrder) => {
      dispatchThunk((_dispatch, getState) => {
        const state = getState();
        if (stateHasOrder(state, order)) {
          return;
        }
        _dispatch(addFiatOrder(order));
        const notificationDetails = getNotificationDetails(order);
        if (notificationDetails) {
          NotificationManager.showSimpleNotification(notificationDetails);
        }
      });

      navigation.navigate(
        ...createOrderProcessingNavDetails({
          orderId: order.id,
        }),
      );
    },
    [dispatchThunk, navigation],
  );

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.provider_webview.title') },
        theme,
      ),
    );
  }, [navigation, theme]);

  useEffect(() => {
    const fetchPaymentUrl = async () => {
      if (!ottResponse || ottError) {
        return;
      }

      await generatePaymentUrl(ottResponse.token, quote, selectedAddress);
    };

    fetchPaymentUrl();
  }, [ottResponse, ottError, generatePaymentUrl, quote, selectedAddress]);

  const handleNavigationStateChange = async (navState: { url: string }) => {
    if (navState.url.startsWith('https://metamask.io')) {
      try {
        const urlObj = new URL(navState.url);
        const orderId = urlObj.searchParams.get('orderId');

        if (orderId) {
          const order = await getOrder(orderId, selectedAddress);

          if (orderError || !order) {
            console.error('Error getting order: ', orderError || 'No order');
            return;
          }

          const processedOrder = depositOrderToFiatOrder(order);

          await handleSuccessfulOrder(processedOrder);
        }
      } catch (e) {
        console.error('Error extracting orderId from URL:', e);
      }
    }
  };

  const error = ottError || webviewError || paymentUrlError;

  if (error) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView
            description={error}
            ctaOnPress={() => {
              setKey((prevKey) => prevKey + 1);
              setWebviewError('');
            }}
            location="Provider Webview"
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (paymentUrl) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <WebView
            key={key}
            source={{ uri: paymentUrl }}
            onNavigationStateChange={handleNavigationStateChange}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              if (nativeEvent.url === paymentUrl) {
                const webviewHttpError = strings(
                  'deposit.provider_webview.webview_received_error',
                  { code: nativeEvent.statusCode },
                );
                setWebviewError(webviewHttpError);
              }
            }}
            allowsInlineMediaPlayback
            enableApplePay
            mediaPlaybackRequiresUserAction={false}
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  return <ScreenLayout />;
};

export default ProviderWebview;
