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

export interface ProviderWebviewParams {
  quote: BuyQuote;
}

export const createProviderWebviewNavDetails =
  createNavigationDetails<ProviderWebviewParams>(
    Routes.DEPOSIT.PROVIDER_WEBVIEW,
  );

const ProviderWebview = () => {
  const [webviewError, setWebviewError] = useState('');
  const navigation = useNavigation();
  const { quote } = useParams<ProviderWebviewParams>();
  const { theme } = useStyles(styleSheet, {});
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const [{ error: ottError, data: ottResponse }] = useDepositSdkMethod({
    method: 'requestOtt',
    onMount: true,
  });

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

  const error = ottError || webviewError || paymentUrlError;

  if (error) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <Text>Error</Text>
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (paymentUrl) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <WebView
            source={{ uri: paymentUrl }}
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
