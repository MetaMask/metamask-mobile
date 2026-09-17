import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
import {
  PERMISSIONS,
  RESULTS,
  requestMultiple,
  type Permission,
  type PermissionStatus,
} from 'react-native-permissions';
import { useParams } from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Logger from '../../../../../util/Logger';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';

export interface ImmersveKYCModalParams {
  url: string;
  redirectUrl: string;
}

type WebViewStatus =
  | 'requesting-permissions'
  | 'loading'
  | 'loaded'
  | 'error'
  | 'permission-error';

type ErrorKind = 'load' | 'permission' | 'runtime';

/** Document-load only — Sumsub liveness can take minutes; do not abort a healthy session. */
export const IMMERSVE_KYC_LOAD_TIMEOUT_MS = 30000;

/**
 * Reports getUserMedia failures and uncaught page errors to RN (host + error
 * name only — no PII). Substitutes for chrome://inspect on RC/release builds.
 * Only getUserMedia rejections are treated as fatal; page errors are diagnostic
 * because the hosted page throws non-fatal errors of its own.
 */
export const IMMERSVE_KYC_ERROR_BRIDGE_JS = `
(function () {
  function post(payload) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    } catch (e) {}
  }

  window.addEventListener('error', function (event) {
    post({
      type: 'immersve-kyc-error',
      source: 'window.onerror',
      message: String((event && event.message) || 'unknown'),
      host: location.host,
    });
  });

  var mediaDevices = navigator.mediaDevices;
  var originalGetUserMedia =
    mediaDevices && mediaDevices.getUserMedia
      ? mediaDevices.getUserMedia.bind(mediaDevices)
      : null;

  if (originalGetUserMedia) {
    mediaDevices.getUserMedia = function () {
      return originalGetUserMedia.apply(mediaDevices, arguments).catch(function (err) {
        post({
          type: 'immersve-kyc-error',
          source: 'getUserMedia',
          message: String((err && (err.name || err.message)) || 'unknown'),
          host: location.host,
        });
        throw err;
      });
    };
  }

  true;
})();
`;

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

const getMediaPermissions = (): Permission[] => {
  if (Platform.OS === 'ios') {
    return [PERMISSIONS.IOS.CAMERA, PERMISSIONS.IOS.MICROPHONE];
  }
  return [PERMISSIONS.ANDROID.CAMERA, PERMISSIONS.ANDROID.RECORD_AUDIO];
};

const areAllPermissionsGranted = (
  statuses: Record<string, PermissionStatus>,
): boolean => Object.values(statuses).every((s) => s === RESULTS.GRANTED);

const isAnyPermissionBlocked = (
  statuses: Record<string, PermissionStatus>,
): boolean =>
  Object.values(statuses).some(
    (s) => s === RESULTS.BLOCKED || s === RESULTS.UNAVAILABLE,
  );

/**
 * Hosted Immersve-conducted KYC webview. Completion is detected by watching for navigation to `redirectUrl`
 * — the URL Immersve sends the user to on exit — after which the modal closes
 * and the progress screen re-polls spending-prerequisites.
 *
 * On Android, Sumsub's getUserMedia only works after the app already holds
 * CAMERA + RECORD_AUDIO; otherwise WebView silently denies PermissionRequest
 * and the page hangs on a black spinner (CARD-555).
 */
const ImmersveKYCModal: React.FC = () => {
  const { url, redirectUrl } = useParams<ImmersveKYCModalParams>();
  const navigation = useNavigation();
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [status, setStatus] = useState<WebViewStatus>('requesting-permissions');
  const [errorKind, setErrorKind] = useState<ErrorKind>('load');
  const [retryKey, setRetryKey] = useState(0);
  const hasClosed = useRef(false);
  // Per kind, so that one reported failure never masks a later failure of a
  // different kind. Same-kind repeats are still deduped: onError and onHttpError
  // often both fire for a single load failure.
  const reportedKinds = useRef(new Set<ErrorKind>());
  const hasLoggedPageError = useRef(false);
  const hasLoadedOnce = useRef(false);

  const getHosts = useCallback(() => {
    let urlHost: string | undefined;
    let redirectHost: string | undefined;
    try {
      urlHost = url ? new URL(url).host : undefined;
    } catch {
      urlHost = undefined;
    }
    try {
      redirectHost = redirectUrl ? new URL(redirectUrl).host : undefined;
    } catch {
      redirectHost = undefined;
    }
    return { urlHost, redirectHost };
  }, [url, redirectUrl]);

  const reportError = useCallback(
    (kind: ErrorKind, data: Record<string, unknown>) => {
      if (reportedKinds.current.has(kind)) {
        return;
      }
      reportedKinds.current.add(kind);

      const { urlHost, redirectHost } = getHosts();

      Logger.error(new Error(`Immersve KYC webview ${kind} failed`), {
        tags: { feature: 'card', provider: 'immersve' },
        context: {
          name: 'ImmersveKYCModal',
          data: {
            ...data,
            urlHost,
            redirectHost,
            retryKey,
          },
        },
      });

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(CardProviderIds.Immersve, {
              action: CardActions.KYC_WEBVIEW_LOAD_ERROR,
            }),
          )
          .build(),
      );
    },
    [trackEvent, createEventBuilder, getHosts, retryKey],
  );

  // Diagnostic only: the hosted page throws its own non-fatal errors, so these
  // must not tear down a verification session that can still complete.
  const logPageError = useCallback(
    (data: Record<string, unknown>) => {
      if (hasLoggedPageError.current) {
        return;
      }
      hasLoggedPageError.current = true;

      const { urlHost, redirectHost } = getHosts();

      Logger.error(new Error('Immersve KYC webview page error'), {
        tags: { feature: 'card', provider: 'immersve' },
        context: {
          name: 'ImmersveKYCModal',
          data: { ...data, urlHost, redirectHost, retryKey },
        },
      });
    },
    [getHosts, retryKey],
  );

  const requestMediaPermissions = useCallback(
    async (isRetry: boolean) => {
      setStatus('requesting-permissions');

      try {
        const statuses = await requestMultiple(getMediaPermissions());
        if (areAllPermissionsGranted(statuses)) {
          setStatus('loading');
          return;
        }

        // A blocked permission means the OS will no longer prompt, so Settings
        // is the only way forward. Decided from this fresh result rather than a
        // remembered one, otherwise granting in Settings and returning here
        // would bounce the user straight back out to Settings again.
        if (isRetry && isAnyPermissionBlocked(statuses)) {
          Linking.openSettings().catch(() => undefined);
        }

        setErrorKind('permission');
        setStatus('permission-error');
        reportError('permission', {
          method: 'requestMediaPermissions',
          statuses,
        });
      } catch (error) {
        setErrorKind('permission');
        setStatus('permission-error');
        reportError('permission', {
          method: 'requestMediaPermissions',
          error: error instanceof Error ? error.message : 'unknown',
        });
      }
    },
    [reportError],
  );

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            screen: CardScreens.IMMERSVE_KYC_WEBVIEW,
          }),
        )
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  useEffect(() => {
    requestMediaPermissions(retryKey > 0).catch(() => undefined);
  }, [retryKey, requestMediaPermissions]);

  // Fail fast if the Immersve document never finishes loading. Only the first
  // load is guarded — Sumsub liveness legitimately takes minutes and navigates
  // within the flow, so a later navigation must never re-arm this.
  useEffect(() => {
    if (status !== 'loading') {
      return;
    }

    const timeoutId = setTimeout(() => {
      setErrorKind('load');
      setStatus('error');
      reportError('load', { method: 'loadTimeout' });
    }, IMMERSVE_KYC_LOAD_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [status, retryKey, reportError]);

  // Any close (header back, or the Immersve page's X → redirect) re-polls the
  // opener so it can route forward (completed) or prompt to reopen (bailed).
  const closeModal = useCallback(
    (reason: 'redirect' | 'dismiss') => {
      // WebView can fire multiple navigation updates for the same redirect URL.
      if (hasClosed.current) {
        return;
      }
      hasClosed.current = true;

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(CardProviderIds.Immersve, {
              action:
                reason === 'redirect'
                  ? CardActions.KYC_WEBVIEW_COMPLETED
                  : CardActions.KYC_WEBVIEW_CLOSE,
            }),
          )
          .build(),
      );
      onCloseCallback?.();
      navigation.goBack();
    },
    [navigation, trackEvent, createEventBuilder],
  );

  const handleRetry = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            action: CardActions.KYC_WEBVIEW_RETRY,
          }),
        )
        .build(),
    );

    reportedKinds.current.clear();
    hasLoggedPageError.current = false;
    hasLoadedOnce.current = false;
    setErrorKind('load');
    setStatus('requesting-permissions');
    setRetryKey((k) => k + 1);
  }, [trackEvent, createEventBuilder]);

  const handleLoadStart = useCallback(() => {
    // In-flow navigations after the first load must not drop an active
    // verification session back into the timed loading state.
    if (hasLoadedOnce.current) {
      return;
    }
    setStatus('loading');
  }, []);
  const handleLoadEnd = useCallback(
    (event?: { nativeEvent?: { loading?: boolean } }) => {
      // Android fires onLoadEnd for each hop of a redirect chain with `loading`
      // still true. Latching on those would disarm the load timeout while the
      // KYC document is still on its way — the exact hang this guards.
      if (event?.nativeEvent?.loading) {
        return;
      }

      hasLoadedOnce.current = true;
      setStatus((s) =>
        s === 'error' || s === 'permission-error' ? s : 'loaded',
      );
    },
    [],
  );
  const handleError = useCallback(
    (event?: {
      nativeEvent?: { statusCode?: number; description?: string };
    }) => {
      setErrorKind('load');
      setStatus('error');
      reportError('load', {
        method: 'handleError',
        httpStatus: event?.nativeEvent?.statusCode,
      });
    },
    [reportError],
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let payload: {
        type?: string;
        source?: string;
        message?: string;
        host?: string;
      };
      try {
        payload = JSON.parse(event.nativeEvent.data) as typeof payload;
      } catch {
        return;
      }

      if (payload.type !== 'immersve-kyc-error') {
        return;
      }

      // Only a failed camera/mic grant is unrecoverable — that is the CARD-555
      // hang. Everything else is logged and the session is left running.
      if (payload.source !== 'getUserMedia') {
        logPageError({
          method: 'handleMessage',
          source: payload.source,
          message: payload.message,
          pageHost: payload.host,
        });
        return;
      }

      setErrorKind('runtime');
      setStatus('error');
      reportError('runtime', {
        method: 'handleMessage',
        source: payload.source,
        message: payload.message,
        pageHost: payload.host,
      });
    },
    [reportError, logPageError],
  );

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      if (redirectUrl && navState.url.startsWith(redirectUrl)) {
        closeModal('redirect');
      }
    },
    [redirectUrl, closeModal],
  );

  const isErrorStatus = status === 'error' || status === 'permission-error';
  const showWebView = status === 'loading' || status === 'loaded';
  const errorMessageKey =
    errorKind === 'permission'
      ? 'card.card_onboarding.immersve_kyc_modal.permission_error'
      : 'card.card_onboarding.immersve_kyc_modal.load_error';

  return (
    <View
      style={[
        tw.style('flex-1 bg-default'),
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
      testID="immersve-kyc-container"
    >
      <HeaderStandard
        onBack={() => closeModal('dismiss')}
        backButtonProps={{ testID: 'immersve-kyc-back-button' }}
        twClassName="bg-background-default"
      />
      {isErrorStatus ? (
        <View
          style={tw.style('flex-1 justify-center items-center p-6 gap-4')}
          testID="immersve-kyc-error-container"
        >
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-error-default text-center"
            testID="immersve-kyc-error-text"
          >
            {strings(errorMessageKey)}
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
          {showWebView && (
            <WebView
              key={retryKey}
              source={{ uri: url }}
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              onError={handleError}
              onHttpError={handleError}
              onMessage={handleMessage}
              onNavigationStateChange={handleNavigationStateChange}
              injectedJavaScript={IMMERSVE_KYC_ERROR_BRIDGE_JS}
              originWhitelist={['*']}
              allowsInlineMediaPlayback
              javaScriptEnabled
              domStorageEnabled
              mediaPlaybackRequiresUserAction={false}
              mediaPlaybackRequiresUserGesture={false}
              mediaCapturePermissionGrantType="grant"
              style={tw.style('flex-1')}
              testID="immersve-kyc-webview"
            />
          )}
          {(status === 'loading' || status === 'requesting-permissions') && (
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
