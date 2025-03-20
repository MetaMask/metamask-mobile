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

interface NativeRampWebViewParams {
  url: string;
}

export const createKycWebviewNavDetails =
  createNavigationDetails<NativeRampWebViewParams>(Routes.RAMP.KYC_WEBVIEW);

const NativeRampWebView = () => {
  const [error, setError] = useState('');
  const [key, setKey] = useState(0);
  const navigation = useNavigation();
  const params = useParams<NativeRampWebViewParams>();
  const { url } = params;
  const { colors } = useTheme();

  useEffect(() => {
    navigation.setOptions(
      getNativeRampNavigationOptions('KYC Verification', colors, navigation),
    );
  }, [navigation, colors]);

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
