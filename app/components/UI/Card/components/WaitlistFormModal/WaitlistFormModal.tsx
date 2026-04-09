import React, { useCallback, useContext, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  IconName as IconNameComponent,
} from '@metamask/design-system-react-native';
import {
  ToastContext,
  ToastVariants,
  ButtonIconVariant,
} from '../../../../../component-library/components/Toast';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { IconName } from '../../../../../component-library/components/Icons/Icon';

export interface WaitlistFormModalParams {
  url: string;
}

// Relays HubSpot's onFormSubmitted postMessage event to React Native
const HUBSPOT_INJECTION = `
  (function() {
    window.addEventListener('message', function(event) {
      try {
        var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.type === 'hsFormCallback' && data.eventName === 'onFormSubmitted') {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'hs_form_submitted' }));
        }
      } catch (e) {}
    });
  })();
  true;
`;

const WaitlistFormModal: React.FC = () => {
  const { url } = useParams<WaitlistFormModalParams>();
  const navigation = useNavigation();
  const tw = useTailwind();
  const { colors } = useTheme();
  const { toastRef } = useContext(ToastContext);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    setRetryKey((k) => k + 1);
  }, []);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data?.type === 'hs_form_submitted') {
          toastRef?.current?.showToast({
            variant: ToastVariants.Icon,
            labelOptions: [
              {
                label: strings(
                  'card.card_onboarding.waitlist_form.success_toast',
                ),
              },
            ],
            iconName: IconName.Confirmation,
            iconColor: colors.success.default,
            hasNoTimeout: true,
            closeButtonOptions: {
              variant: ButtonIconVariant.Icon,
              iconName: IconName.Close,
              onPress: () => toastRef?.current?.closeToast(),
            },
          });
          navigation.navigate(Routes.WALLET.HOME as never);
        }
      } catch {
        // ignore non-JSON messages
      }
    },
    [toastRef, navigation, colors],
  );

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      edges={['top', 'bottom']}
    >
      <View style={tw.style('flex-row items-center h-11')}>
        <ButtonIcon
          size={ButtonIconSize.Md}
          iconName={IconNameComponent.ArrowLeft}
          onPress={handleClose}
          style={tw.style('mx-4')}
          testID="waitlist-form-back-button"
        />
      </View>
      {hasError ? (
        <View
          style={tw.style('flex-1 justify-center items-center p-6 gap-4')}
          testID="waitlist-form-error-container"
        >
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-error-default text-center"
            testID="waitlist-form-error-text"
          >
            {strings('card.card_onboarding.waitlist_form.load_error')}
          </Text>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Md}
            onPress={handleRetry}
            testID="waitlist-form-retry-button"
          >
            {strings('card.card_onboarding.waitlist_form.try_again')}
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
            onMessage={handleMessage}
            originWhitelist={['*']}
            injectedJavaScript={HUBSPOT_INJECTION}
            javaScriptEnabled
            style={tw.style('flex-1')}
            testID="waitlist-form-webview"
          />
          {isLoading && (
            <View
              style={tw.style(
                'absolute inset-0 justify-center items-center bg-default',
              )}
              testID="waitlist-form-loading"
            >
              <ActivityIndicator size="large" />
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

export default WaitlistFormModal;
