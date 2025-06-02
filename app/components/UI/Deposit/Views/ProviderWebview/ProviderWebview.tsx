import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { WebView } from '@metamask/react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { baseStyles } from '../../../../../styles/common';
import ScreenLayout from '../../../Ramp/components/ScreenLayout';
import ErrorView from '../../../Ramp/components/ErrorView';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import { getDepositNavbarOptions } from '../../../Navbar';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './ProviderWebview.styles';

const url =
  'https://staging-verify.transak.com/kyc?token=sample-token-for-testing';

interface NativeRampWebViewParams {
  url: string;
  isPaymentWidget?: boolean;
  onOrderComplete?: (orderId: string) => void;
}

// export const createKycWebviewNavDetails =
//   createNavigationDetails<NativeRampWebViewParams>(Routes.RAMP.KYC_WEBVIEW);

const NativeRampWebView = () => {
  const [error, setError] = useState('');
  const [key, setKey] = useState(0);
  const [isRedirectionHandled, setIsRedirectionHandled] = useState(false);
  const navigation = useNavigation();
  const params = useParams<NativeRampWebViewParams>();
  const { url, isPaymentWidget, onOrderComplete } = params;
  const { styles, theme } = useStyles(styleSheet, {});

  console.log(
    `





  RENDERING WEBVIEW





    `,
    url,
  );

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: isPaymentWidget ? 'Complete Payment' : 'KYC Verification' },
        theme,
      ),
    );
  }, [isPaymentWidget, navigation, theme]);

  const handleNavigationStateChange = (navState: { url: string }) => {
    if (
      !isRedirectionHandled &&
      navState.url.startsWith('https://metamask.io')
    ) {
      setIsRedirectionHandled(true);

      try {
        const urlObj = new URL(navState.url);
        const orderId = urlObj.searchParams.get('orderId');

        if (orderId && onOrderComplete) {
          onOrderComplete(orderId);
        }
      } catch (e) {
        console.error('Error extracting orderId from URL:', e);
      }
    }
  };

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
            location="Provider Webview"
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  // if (url) {
  return (
    <View style={baseStyles.flexGrow}>
      <WebView
        key={key}
        source={{ uri: url }}
        onNavigationStateChange={handleNavigationStateChange}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          if (nativeEvent.url === url) {
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
      />
    </View>
  );
  // }

  // return null;
};

export default NativeRampWebView;
