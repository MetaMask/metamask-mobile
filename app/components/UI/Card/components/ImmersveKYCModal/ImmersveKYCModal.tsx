import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Linking,
  Platform,
  View,
  type AppStateStatus,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AnimationDuration } from '@metamask/design-tokens';
import {
  WebView,
  WebViewMessageEvent,
  WebViewNavigation,
} from '@metamask/react-native-webview';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { IconSize, Spinner } from '@metamask/design-system-react-native';
import {
  PERMISSIONS,
  RESULTS,
  checkMultiple,
  requestMultiple,
  type Permission,
  type PermissionStatus,
} from 'react-native-permissions';
import {
  Camera,
  type CameraPermissionStatus,
} from 'react-native-vision-camera';
import { useParams } from '../../../../../util/navigation/navUtils';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Logger from '../../../../../util/Logger';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';
import { useSelector } from 'react-redux';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { useTheme } from '../../../../../util/theme';
import { useReduceMotion } from '../../../Money/hooks/useReduceMotion';
import { useExitCardFlow } from '../../hooks/useExitCardFlow';
import ImmersveKycIdentityLayout from '../Onboarding/ImmersveKycIdentityLayout';
import ImmersveLogo from '../../../../../images/immersve-logo.svg';

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

/**
 * Hides Immersve's progress dots, logo, and Close button before first paint,
 * and collapses the empty logo row so the progress bar sits under our header.
 * The logo and dots are scoped to their progress header; the Close button is
 * not, so it stays hidden on every Immersve screen. Sumsub never renders these
 * hooks. Injected on both platforms; the Vue app mounts into #app and never
 * replaces <html>, so the style survives in-flow screen changes.
 */
export const IMMERSVE_KYC_UI_JS = `
(function () {
  var style = document.createElement('style');
  style.textContent = [
    '[data-test="session-progress-header"] .rounded-full,',
    '[data-test="session-progress-header"] .logo,',
    '[data-test="exit"] { display: none !important; }',
    '[data-test="session-progress-header"] > header > div:first-child { margin-top: 0 !important; }',
    '[data-test="session-progress-header"] > header > div:nth-child(2) { margin-top: 8px !important; }',
  ].join(' ');
  (document.head || document.documentElement).appendChild(style);
  true;
})();
`;

/** A retry after the page has loaded must not reuse the one-time KYC link. */
export interface ImmersveKycCloseOptions {
  reopen?: boolean;
}

// The opener re-polls when the webview closes back onto it. Close and that
// re-poll have to happen together: a confirmed exit removes the processing
// screen before focus returns, so useFocusEffect is not a reliable signal.
let onCloseCallback:
  | ((completed: boolean, options?: ImmersveKycCloseOptions) => void)
  | null = null;

export const setImmersveKycOnClose = (
  callback: (completed: boolean, options?: ImmersveKycCloseOptions) => void,
) => {
  onCloseCallback = callback;
};

export const clearImmersveKycOnClose = () => {
  onCloseCallback = null;
};

const ANDROID_MEDIA_PERMISSIONS: Permission[] = [
  PERMISSIONS.ANDROID.CAMERA,
  PERMISSIONS.ANDROID.RECORD_AUDIO,
];

const areAllPermissionsGranted = (
  statuses: Record<string, PermissionStatus>,
): boolean => Object.values(statuses).every((s) => s === RESULTS.GRANTED);

const isAnyPermissionBlocked = (
  statuses: Record<string, PermissionStatus>,
): boolean =>
  Object.values(statuses).some(
    (s) => s === RESULTS.BLOCKED || s === RESULTS.UNAVAILABLE,
  );

const isIosPermissionBlocked = (status: CameraPermissionStatus): boolean =>
  status === 'denied' || status === 'restricted';

/**
 * getUserMedia reports a denial as NotAllowedError, and some WebViews surface
 * the same refusal as SecurityError. Either one means the camera prompt was
 * refused after the one-time KYC link was already opened.
 */
const isMediaPermissionFailure = (message: string | undefined): boolean =>
  message === 'NotAllowedError' || message === 'SecurityError';

interface MediaPermissionResult {
  granted: boolean;
  blocked: boolean;
  detail: Record<string, string>;
}

const resolveAndroidMediaPermissions = async (
  prompt: boolean,
): Promise<MediaPermissionResult> => {
  const statuses = prompt
    ? await requestMultiple(ANDROID_MEDIA_PERMISSIONS)
    : await checkMultiple(ANDROID_MEDIA_PERMISSIONS);
  return {
    granted: areAllPermissionsGranted(statuses),
    blocked: isAnyPermissionBlocked(statuses),
    detail: statuses,
  };
};

const resolveIosMediaPermission = async (
  read: () => CameraPermissionStatus,
  request: () => Promise<CameraPermissionStatus | 'granted' | 'denied'>,
  prompt: boolean,
): Promise<CameraPermissionStatus | 'granted' | 'denied'> => {
  const current = read();
  if (prompt && current === 'not-determined') {
    return request();
  }
  return current;
};

const resolveIosMediaPermissions = async (
  prompt: boolean,
): Promise<MediaPermissionResult> => {
  const camera = await resolveIosMediaPermission(
    () => Camera.getCameraPermissionStatus(),
    () => Camera.requestCameraPermission(),
    prompt,
  );
  const microphone = await resolveIosMediaPermission(
    () => Camera.getMicrophonePermissionStatus(),
    () => Camera.requestMicrophonePermission(),
    prompt,
  );
  return {
    granted: camera === 'granted' && microphone === 'granted',
    blocked:
      isIosPermissionBlocked(camera) || isIosPermissionBlocked(microphone),
    detail: { camera, microphone },
  };
};

/**
 * Hosted Immersve-conducted KYC webview. Completion is detected by watching for navigation to `redirectUrl`
 * — the URL Immersve sends the user to on exit — after which the modal closes
 * back onto the KYC screen. That screen re-polls spending-prerequisites and
 * shows the result in place.
 *
 * The KYC url carries a one-time code. Camera and microphone are resolved
 * before that url loads, on both platforms. Android still prompts first
 * because WebView silently denies getUserMedia until CAMERA and RECORD_AUDIO
 * are granted (CARD-555). Try again after the page has loaded asks the
 * processing screen for a fresh url instead of reloading this one. Closing
 * from a permission or load error leaves Card setup: going back would only
 * show the spinner, then "Finish verifying". Both platforms inject a style
 * before first paint that hides Immersve's progress-bar dots, logo, and
 * Close button. Our header shows the logo.
 */
const ImmersveKYCModal: React.FC = () => {
  const { colors } = useTheme();
  const exitCardFlow = useExitCardFlow();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const { url, redirectUrl } = useParams<ImmersveKYCModalParams>();
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [status, setStatus] = useState<WebViewStatus>('requesting-permissions');
  // The OS will not prompt again. Settings is the only way to grant access,
  // and the link has not been opened yet, so it can still be used afterwards.
  const [canOpenSettings, setCanOpenSettings] = useState(false);
  const [errorKind, setErrorKind] = useState<ErrorKind>('load');
  const [retryKey, setRetryKey] = useState(0);
  const hasClosed = useRef(false);
  // Per kind, so that one reported failure never masks a later failure of a
  // different kind. Same-kind repeats are still deduped: onError and onHttpError
  // often both fire for a single load failure.
  const reportedKinds = useRef(new Set<ErrorKind>());
  const hasLoggedPageError = useRef(false);
  const hasLoadedOnce = useRef(false);
  // Set once the WebView is allowed to mount. A later retry must not reload
  // the same url: the code in it has already been spent.
  const hasMountedWebView = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

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
    async (prompt: boolean) => {
      setStatus('requesting-permissions');

      try {
        const result =
          Platform.OS === 'ios'
            ? await resolveIosMediaPermissions(prompt)
            : await resolveAndroidMediaPermissions(prompt);
        if (result.granted) {
          // The url loads only after this. A denial from here on has spent it.
          hasMountedWebView.current = true;
          setCanOpenSettings(false);
          setStatus('loading');
          return;
        }

        // Decided from this fresh result. A permission granted in Settings
        // since the last check must not keep sending the user back there.
        setCanOpenSettings(result.blocked);
        setErrorKind('permission');
        setStatus('permission-error');
        reportError('permission', {
          method: 'requestMediaPermissions',
          statuses: result.detail,
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

  const requestMediaPermissionsRef = useRef(requestMediaPermissions);
  requestMediaPermissionsRef.current = requestMediaPermissions;
  const statusRef = useRef(status);
  statusRef.current = status;

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
    requestMediaPermissions(true).catch(() => undefined);
  }, [retryKey, requestMediaPermissions]);

  // A grant made in Settings does not notify the app. Recheck when we come
  // back, without prompting, and only while the KYC url is still unused.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const returnedToForeground =
        (appStateRef.current === 'inactive' ||
          appStateRef.current === 'background') &&
        nextState === 'active';
      appStateRef.current = nextState;
      if (
        !returnedToForeground ||
        hasMountedWebView.current ||
        statusRef.current !== 'permission-error'
      ) {
        return;
      }
      requestMediaPermissionsRef.current(false).catch(() => undefined);
    });
    return (): void => {
      subscription.remove();
    };
  }, []);

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

  // A close during the session returns to the processing screen, which
  // re-polls. The header X and the completion redirect call goBack. Android
  // back is already that goBack, so it only notifies — a second goBack would
  // also pop the processing screen. An error screen does not return there:
  // its X and back leave Card setup, and the parent pop that follows must
  // not be treated as another close.
  const markClosed = useCallback(
    (completed: boolean): boolean => {
      if (hasClosed.current) {
        return false;
      }
      hasClosed.current = true;

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(CardProviderIds.Immersve, {
              action: completed
                ? CardActions.KYC_WEBVIEW_COMPLETED
                : CardActions.KYC_WEBVIEW_CLOSE,
            }),
          )
          .build(),
      );
      return true;
    },
    [trackEvent, createEventBuilder],
  );

  const closeWebview = useCallback(
    (completed: boolean, options?: ImmersveKycCloseOptions): void => {
      if (!markClosed(completed)) {
        return;
      }
      // Omit the options argument when there are none, so a plain close stays
      // a single-argument call.
      if (options) {
        onCloseCallback?.(completed, options);
      } else {
        onCloseCallback?.(completed);
      }
    },
    [markClosed],
  );

  const dismissWebview = useCallback(
    (completed: boolean): void => {
      closeWebview(completed);
      navigation.goBack();
    },
    [closeWebview, navigation],
  );

  // Leaves the onboarding stack. The processing screen is not told, so it
  // does not poll on the way out.
  const exitSetup = useCallback((): void => {
    if (!markClosed(false)) {
      return;
    }
    exitCardFlow();
  }, [markClosed, exitCardFlow]);

  const handleClose = useCallback((): void => {
    if (status === 'error' || status === 'permission-error') {
      exitSetup();
      return;
    }
    dismissWebview(false);
  }, [status, exitSetup, dismissWebview]);

  useEffect(() => {
    const unsubscribe = navigation.addListener(
      'beforeRemove',
      (event): void => {
        const { type } = event.data.action;
        if (type !== 'GO_BACK' && type !== 'POP') {
          return;
        }
        // Already closed, including the parent pop from leaving Card setup.
        if (hasClosed.current) {
          return;
        }
        const showingError =
          statusRef.current === 'error' ||
          statusRef.current === 'permission-error';
        if (showingError) {
          event.preventDefault();
          exitSetup();
          return;
        }
        closeWebview(false);
      },
    );
    return unsubscribe;
  }, [navigation, closeWebview, exitSetup]);

  const handleOpenSettings = useCallback(() => {
    Linking.openSettings().catch(() => undefined);
  }, []);

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

    // The page already loaded this url. Reloading it shows a dead session.
    // The processing screen polls for a new one and opens that.
    if (hasMountedWebView.current) {
      closeWebview(false, { reopen: true });
      navigation.goBack();
      return;
    }

    reportedKinds.current.clear();
    hasLoggedPageError.current = false;
    hasLoadedOnce.current = false;
    setCanOpenSettings(false);
    setErrorKind('load');
    setStatus('requesting-permissions');
    setRetryKey((k) => k + 1);
  }, [closeWebview, navigation, trackEvent, createEventBuilder]);

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

      const permissionDenied = isMediaPermissionFailure(payload.message);
      setErrorKind(permissionDenied ? 'permission' : 'runtime');
      setStatus(permissionDenied ? 'permission-error' : 'error');
      reportError(permissionDenied ? 'permission' : 'runtime', {
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
        dismissWebview(true);
      }
    },
    [redirectUrl, dismissWebview],
  );

  const isErrorStatus = status === 'error' || status === 'permission-error';
  const showWebView = status === 'loading' || status === 'loaded';
  // Settings only helps before the url is opened. A refusal inside the page
  // needs a fresh link, which Try again asks the processing screen for.
  const offerSettings =
    status === 'permission-error' &&
    canOpenSettings &&
    !hasMountedWebView.current;
  const isPermissionError = errorKind === 'permission';
  const errorTitleKey = isPermissionError
    ? 'card.card_onboarding.immersve_kyc_modal.permission_title'
    : 'card.card_onboarding.immersve_kyc_modal.load_error_title';
  let errorDescriptionKey =
    'card.card_onboarding.immersve_kyc_modal.load_error';
  if (isPermissionError) {
    errorDescriptionKey = offerSettings
      ? 'card.card_onboarding.immersve_kyc_modal.permission_settings_description'
      : 'card.card_onboarding.immersve_kyc_modal.permission_error';
  }

  // iOS VoiceOver ignores accessibilityLiveRegion, so speak the error instead.
  useEffect(() => {
    if (!isErrorStatus) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(
      `${strings(errorTitleKey)}. ${strings(errorDescriptionKey)}`,
    );
  }, [isErrorStatus, errorTitleKey, errorDescriptionKey]);

  return (
    <View
      style={[
        tw.style('flex-1 bg-default'),
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
      testID="immersve-kyc-container"
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        onClose={handleClose}
        closeButtonProps={{ testID: 'immersve-kyc-close-button' }}
        title={
          <ImmersveLogo
            name="immersve-logo"
            width={102}
            height={24}
            color={colors.text.default}
            accessibilityLabel="Immersve"
            testID="immersve-kyc-header-logo"
          />
        }
        twClassName="bg-background-default"
      />
      {isErrorStatus ? (
        <Animated.View
          style={tw.style('flex-1')}
          entering={
            reduceMotion
              ? undefined
              : FadeIn.duration(AnimationDuration.Regularly)
          }
          testID="immersve-kyc-error-container"
        >
          <ImmersveKycIdentityLayout
            title={strings(errorTitleKey)}
            description={strings(errorDescriptionKey)}
            descriptionTestID="immersve-kyc-error-text"
            illustrationTestID="immersve-kyc-error-illustration"
            buttonLabel={strings(
              offerSettings
                ? 'card.card_onboarding.immersve_kyc_modal.open_settings'
                : 'card.card_onboarding.immersve_kyc_modal.try_again',
            )}
            onButtonPress={offerSettings ? handleOpenSettings : handleRetry}
            buttonTestID={
              offerSettings
                ? 'immersve-kyc-open-settings-button'
                : 'immersve-kyc-retry-button'
            }
          />
        </Animated.View>
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
              injectedJavaScriptBeforeContentLoaded={IMMERSVE_KYC_UI_JS}
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
              <Spinner spinnerIconProps={{ size: IconSize.Xl }} />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default ImmersveKYCModal;
