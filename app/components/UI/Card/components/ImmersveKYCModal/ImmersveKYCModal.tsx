import React, { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { WebView, WebViewNavigation } from '@metamask/react-native-webview';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useParams } from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';

export interface ImmersveKYCModalParams {
  url: string;
  redirectUrl: string;
}

type WebViewStatus = 'loading' | 'loaded' | 'error';

// Simple callback registry so the opener (ImmersveKYCProcessing) learns when the
// webview closes. Needed because this modal is a transparentModal that keeps the
// presenting screen mounted without blurring it, so useFocusEffect never re-fires
// on close — mirrors RegionSelectorModal's setOnValueChange pattern.
let onCloseCallback: (() => void) | null = null;

export const setImmersveKycOnClose = (callback: () => void) => {
  onCloseCallback = callback;
};

export const clearImmersveKycOnClose = () => {
  onCloseCallback = null;
};

/**
 * Hosted Immersve-conducted KYC webview. Completion is detected by watching for navigation to `redirectUrl`
 * — the URL Immersve sends the user to on exit — after which the modal closes
 * and the progress screen re-polls spending-prerequisites.
 */
const ImmersveKYCModal: React.FC = () => {
  const { url, redirectUrl } = useParams<ImmersveKYCModalParams>();
  const navigation = useNavigation();
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<WebViewStatus>('loading');
  const [retryKey, setRetryKey] = useState(0);

  // Immersve page's X → redirect closes the modal and re-polls the opener so it
  // can route forward (completed) or prompt to reopen (bailed).
  const closeModal = useCallback(() => {
    onCloseCallback?.();
    navigation.goBack();
  }, [navigation]);

  const handleRetry = useCallback(() => {
    setStatus('loading');
    setRetryKey((k) => k + 1);
  }, []);

  const handleLoadStart = useCallback(() => setStatus('loading'), []);
  const handleLoadEnd = useCallback(
    () => setStatus((s) => (s === 'error' ? s : 'loaded')),
    [],
  );
  const handleError = useCallback(() => setStatus('error'), []);

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      if (redirectUrl && navState.url.startsWith(redirectUrl)) {
        closeModal();
      }
    },
    [redirectUrl, closeModal],
  );

  return (
    <View
      style={[
        tw.style('flex-1 bg-default'),
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
      testID="immersve-kyc-container"
    >
      {status === 'error' ? (
        <View
          style={tw.style('flex-1 justify-center items-center p-6 gap-4')}
          testID="immersve-kyc-error-container"
        >
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-error-default text-center"
            testID="immersve-kyc-error-text"
          >
            {strings('card.card_onboarding.immersve_kyc_modal.load_error')}
          </Text>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Md}
            onPress={handleRetry}
            testID="immersve-kyc-retry-button"
          >
            {strings('card.card_onboarding.immersve_kyc_modal.try_again')}
          </Button>
        </View>
      ) : (
        <View style={tw.style('flex-1')}>
          <WebView
            key={retryKey}
            source={{ uri: url }}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
            onHttpError={handleError}
            onNavigationStateChange={handleNavigationStateChange}
            originWhitelist={['*']}
            allowsInlineMediaPlayback
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            mediaPlaybackRequiresUserGesture={false}
            style={tw.style('flex-1')}
            testID="immersve-kyc-webview"
          />
          {status === 'loading' && (
            <View
              style={tw.style(
                'absolute inset-0 justify-center items-center bg-default',
              )}
              testID="immersve-kyc-loading"
            >
              <ActivityIndicator size="large" />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default ImmersveKYCModal;
