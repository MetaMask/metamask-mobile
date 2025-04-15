import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { WebView } from '@metamask/react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { baseStyles } from '../../../../../styles/common';
import ScreenLayout from '../../components/ScreenLayout';
import ErrorView from '../../components/ErrorView';
import { strings } from '../../../../../../locales/i18n';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { getNativeRampNavigationOptions } from '../../../Navbar';
import { useTheme } from '../../../../../util/theme';
import { callbackBaseDeeplink } from '../../sdk';

interface NativeRampWebViewParams {
  url: string;
  isPaymentWidget?: boolean;
}

export const createKycWebviewNavDetails =
  createNavigationDetails<NativeRampWebViewParams>(Routes.RAMP.KYC_WEBVIEW);

const NativeRampWebView = () => {
  const [error, setError] = useState('');
  const [key, setKey] = useState(0);
  const navigation = useNavigation();
  const params = useParams<NativeRampWebViewParams>();
  const { url, isPaymentWidget } = params;
  const { colors } = useTheme();

  useEffect(() => {
    const title = isPaymentWidget ? 'Complete Payment' : 'KYC Verification';
    navigation.setOptions(
      getNativeRampNavigationOptions(title, colors, navigation),
    );
  }, [navigation, colors, isPaymentWidget]);

  const handleNavigationStateChange = (navState: { url: string }) => {
    if (navState.url.startsWith(callbackBaseDeeplink)) {
      navigation.goBack();
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
            }}
            location="Provider Webview"
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (url) {
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
  }

  return null;
};

export default NativeRampWebView;
