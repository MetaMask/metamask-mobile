import React, { useEffect, useState } from 'react';
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
import Text from '../../../../../../component-library/components/Texts/Text';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { createOrderProcessingNavDetails } from '../OrderProcessing/OrderProcessing';
import ErrorView from '../../../Aggregator/components/ErrorView';

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
      if (!ottResponse) {
        return;
      }

      await generatePaymentUrl(ottResponse.token, quote, selectedAddress);
    };

    fetchPaymentUrl();
  }, [ottResponse, generatePaymentUrl, quote, selectedAddress]);

  const handleNavigationStateChange = (navState: { url: string }) => {
    if (navState.url.startsWith('https://metamask.io')) {
      try {
        const urlObj = new URL(navState.url);
        const orderId = urlObj.searchParams.get('orderId');

        if (orderId) {
          navigation.navigate(
            ...createOrderProcessingNavDetails({
              quoteId: orderId,
            }),
          );
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
  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <Text>Loading...</Text>
      </ScreenLayout.Body>
    </ScreenLayout>
  );
};

export default ProviderWebview;
