import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  WebView,
  WebViewMessageEvent,
  WebViewNavigation,
} from '@metamask/react-native-webview';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  HeaderStandard,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import AppConstants from '../../../../../core/AppConstants';
import { isCardLoginUrl, isCardUrl } from '../../../../../util/url';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardScreens } from '../../util/metrics';
import { getCardWebBaseUrlForMetaMaskEnv } from '../../util/mapCardWebUrl';
import { useSelector } from 'react-redux';
import { selectCardUserLocation } from '../../../../../selectors/cardController';
import type { CardLocation } from '../../types';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName } from '../../../../../component-library/components/Icons/Icon';

// Single document-end injection. We intentionally do NOT use
// `injectedJavaScriptBeforeContentLoaded`, which blanks the page on iOS WKWebView.
// This script:
// 1. Watches SPA route changes (history.pushState / replaceState / popstate),
// which `onNavigationStateChange` can miss on Android, and relays the current
// path back to React Native so the modal closes when the card login page is
// reached after a successful reset.
// 2. Forces the page theme to match the MetaMask app theme via the `<html>`
// class the card web app reads.
// 3. Hides the page's own back button and theme switcher so only our native
// chrome shows. Substring selectors survive CSS-module hashing.
// 4. Seeds the card web app's region flag (localStorage['isUsEnv']) so the
// password reset targets the correct US/international API cluster,
// reloading once if the persisted env needs to change.
const buildInjectedJavaScript = (theme: 'light' | 'dark', isUs: boolean) => `
  (function () {
    // The card web app decides which API cluster to call (US vs international)
    // once at bundle load, from localStorage['isUsEnv']. We can't pass the
    // region through the URL — the /account/password/request route ignores the
    // ?isUs query param — so we seed the flag here. When the web app's current
    // env doesn't match the user's region, set it and reload once so the
    // password reset request hits the right cluster. Comparing booleans keeps
    // the common (international) case reload-free and prevents a reload loop.
    try {
      var wantUs = ${isUs ? 'true' : 'false'};
      var currentUs = localStorage.getItem('isUsEnv') === 'true';
      if (currentUs !== wantUs) {
        localStorage.setItem('isUsEnv', wantUs ? 'true' : 'false');
        window.location.reload();
        return;
      }
    } catch (e) {}

    var THEME = '${theme}';
    var OTHER = '${theme === 'dark' ? 'light' : 'dark'}';

    // Re-assert the theme whenever the card web app rewrites the <html> class
    // during hydration. The contains() guards make this idempotent so our own
    // edits don't retrigger the observer into a loop.
    function applyTheme() {
      try {
        var el = document.documentElement;
        if (!el) return;
        if (!el.classList.contains(THEME)) el.classList.add(THEME);
        if (el.classList.contains(OTHER)) el.classList.remove(OTHER);
      } catch (e) {}
    }
    applyTheme();
    try {
      new MutationObserver(applyTheme).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });
    } catch (e) {}

    try {
      var style = document.createElement('style');
      style.innerHTML =
        '[class*="accountAuthentication__back_button_container"],' +
        '[class*="standaloneCardHeader__theme_container"]' +
        '{display:none !important;}';
      (document.head || document.documentElement).appendChild(style);
    } catch (e) {}

    function postPath() {
      try {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'card_route', path: window.location.pathname }),
        );
      } catch (e) {}
    }
    var pushState = history.pushState;
    history.pushState = function () {
      pushState.apply(history, arguments);
      postPath();
    };
    var replaceState = history.replaceState;
    history.replaceState = function () {
      replaceState.apply(history, arguments);
      postPath();
    };
    window.addEventListener('popstate', postPath);
    postPath();
  })();
  true;
`;

type WebViewStatus = 'loading' | 'loaded' | 'error';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ForgotPasswordModalParams = {
  CardForgotPasswordModal: { location?: CardLocation } | undefined;
};

const ForgotPasswordModal: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<ForgotPasswordModalParams, 'CardForgotPasswordModal'>>();
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const { themeAppearance, colors } = useTheme();
  const { toastRef } = useContext(ToastContext);
  const persistedLocation = useSelector(selectCardUserLocation);
  const isUs =
    (route.params?.location ?? persistedLocation ?? 'international') === 'us';
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [status, setStatus] = useState<WebViewStatus>('loading');
  const [retryKey, setRetryKey] = useState(0);
  const hasClosedRef = useRef(false);

  // The reset/login web flow lives on a different host per environment.
  const cardBaseUrl = useMemo(
    () => getCardWebBaseUrlForMetaMaskEnv(process.env.METAMASK_ENVIRONMENT),
    [],
  );
  const passwordResetUrl = `${cardBaseUrl}${AppConstants.CARD.PASSWORD_RESET_PATH}`;

  const injectedJavaScript = useMemo(
    () =>
      buildInjectedJavaScript(
        themeAppearance === AppThemeKey.dark ? 'dark' : 'light',
        isUs,
      ),
    [themeAppearance, isUs],
  );

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.FORGOT_PASSWORD,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const closeOnLoginReached = useCallback(() => {
    if (hasClosedRef.current) return;
    hasClosedRef.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_PASSWORD_RESET_COMPLETED)
        .addProperties({ screen: CardScreens.FORGOT_PASSWORD })
        .build(),
    );
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [
        { label: strings('card.card_forgot_password.reset_success') },
      ],
      iconName: IconName.Confirmation,
      iconColor: colors.success.default,
      hasNoTimeout: false,
    });
    navigation.goBack();
  }, [navigation, toastRef, colors, trackEvent, createEventBuilder]);

  const handleRetry = useCallback(() => {
    setStatus('loading');
    setRetryKey((k) => k + 1);
  }, []);

  const handleLoadStart = useCallback(() => {
    setStatus('loading');
  }, []);

  const handleLoadEnd = useCallback(() => {
    // Don't override an error that occurred during this load.
    setStatus((prev) => (prev === 'error' ? prev : 'loaded'));
  }, []);

  const handleError = useCallback(() => {
    setStatus('error');
  }, []);

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      if (isCardLoginUrl(navState.url, cardBaseUrl)) {
        closeOnLoginReached();
      }
    },
    [closeOnLoginReached, cardBaseUrl],
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        if (!isCardUrl(event.nativeEvent.url, cardBaseUrl)) {
          return;
        }
        const data = JSON.parse(event.nativeEvent.data);
        if (
          data?.type === 'card_route' &&
          typeof data.path === 'string' &&
          data.path.startsWith(AppConstants.CARD.LOGIN_PATH)
        ) {
          closeOnLoginReached();
        }
      } catch {
        // ignore non-JSON messages
      }
    },
    [closeOnLoginReached, cardBaseUrl],
  );

  return (
    <View
      style={[
        tw.style('flex-1 bg-default'),
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
      testID="forgot-password-container"
    >
      <HeaderStandard
        onBack={handleClose}
        backButtonProps={{ testID: 'forgot-password-back-button' }}
        twClassName="bg-background-default"
      />
      {status === 'error' ? (
        <View
          style={tw.style('flex-1 justify-center items-center p-6 gap-4')}
          testID="forgot-password-error-container"
        >
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-error-default text-center"
            testID="forgot-password-error-text"
          >
            {strings('card.card_forgot_password.load_error')}
          </Text>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Md}
            onPress={handleRetry}
            testID="forgot-password-retry-button"
          >
            {strings('card.card_forgot_password.try_again')}
          </Button>
        </View>
      ) : (
        <View style={tw.style('flex-1')}>
          <WebView
            key={retryKey}
            source={{ uri: passwordResetUrl }}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
            onHttpError={handleError}
            onMessage={handleMessage}
            onNavigationStateChange={handleNavigationStateChange}
            injectedJavaScript={injectedJavaScript}
            originWhitelist={['*']}
            javaScriptEnabled
            style={tw.style('flex-1')}
            testID="forgot-password-webview"
          />
          {status === 'loading' && (
            <View
              style={tw.style(
                'absolute inset-0 justify-center items-center bg-default',
              )}
              testID="forgot-password-loading"
            >
              <ActivityIndicator size="large" />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default ForgotPasswordModal;
