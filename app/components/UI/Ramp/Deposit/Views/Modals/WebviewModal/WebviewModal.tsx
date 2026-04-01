import React, { useCallback, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCompactStandard from '../../../../../../../component-library/components-temp/HeaderCompactStandard';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../../constants/navigation/Routes';
import { WebView } from '@metamask/react-native-webview';
import ScreenLayout from '../../../../Aggregator/components/ScreenLayout';
import { strings } from '../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../component-library/hooks/useStyles';
import styleSheet from './WebviewModal.styles';
import ErrorView from '../../../components/ErrorView';
import Device from '../../../../../../../util/device';
import Logger from '../../../../../../../util/Logger';
import { shouldStartLoadWithRequest } from '../../../../../../../util/browser';
import { useAnalytics } from '../../../../../../../components/hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../../core/Analytics';
import { redactUrlForAnalytics } from '../../../../utils/redactUrlForAnalytics';
import {
  PROVIDER_EVENT_BRIDGE_SCRIPT,
  handleProviderEventMessage,
} from '../../../../utils/providerEventBridge';

export interface WebviewModalParams {
  sourceUrl: string;
  handleNavigationStateChange?: (navState: { url: string }) => void;
}

export const createWebviewModalNavigationDetails =
  createNavigationDetails<WebviewModalParams>(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.WEBVIEW,
  );

function WebviewModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const previousUrlRef = useRef<string | null>(null);
  const loadStartTimeRef = useRef<number | null>(null);
  const { sourceUrl, handleNavigationStateChange } =
    useParams<WebviewModalParams>();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const { height: screenHeight } = useWindowDimensions();

  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });

  const [webviewError, setWebviewError] = useState<string | null>(null);

  const handleNavigationStateChangeWithDedup = useCallback(
    (navState: { url: string }) => {
      if (navState.url !== previousUrlRef.current) {
        previousUrlRef.current = navState.url;
        trackEvent(
          createEventBuilder(MetaMetricsEvents.RAMPS_CHECKOUT_URL_CHANGE)
            .addProperties({
              location: 'WebviewModal',
              ramp_type: 'UNIFIED_BUY_2',
              url_path: redactUrlForAnalytics(navState.url),
              is_callback_url: false,
            })
            .build(),
        );
        handleNavigationStateChange?.(navState);
      }
    },
    [handleNavigationStateChange, createEventBuilder, trackEvent],
  );

  const handleLoadStart = useCallback(() => {
    loadStartTimeRef.current = Date.now();
  }, []);

  const handleLoadEnd = useCallback(
    (syntheticEvent: { nativeEvent: { url: string } }) => {
      const { url: loadedUrl } = syntheticEvent.nativeEvent;
      const durationMs = loadStartTimeRef.current
        ? Date.now() - loadStartTimeRef.current
        : 0;
      loadStartTimeRef.current = null;

      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_CHECKOUT_LOAD_COMPLETE)
          .addProperties({
            location: 'WebviewModal',
            ramp_type: 'UNIFIED_BUY_2',
            url_path: redactUrlForAnalytics(loadedUrl),
            load_duration_ms: durationMs,
          })
          .build(),
      );
    },
    [createEventBuilder, trackEvent],
  );

  const handleShouldStartLoadWithRequest = useCallback(
    ({ url }: { url: string }) => shouldStartLoadWithRequest(url, Logger),
    [],
  );

  const handleWebViewMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      handleProviderEventMessage(event.nativeEvent.data);
    },
    [],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      isFullscreen
      isInteractable={!Device.isAndroid()}
      keyboardAvoidingViewEnabled={false}
    >
      <HeaderCompactStandard
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
      />

      <ScreenLayout>
        <ScreenLayout.Body>
          {webviewError ? (
            <ErrorView description={webviewError} />
          ) : (
            <WebView
              style={styles.webview}
              source={{ uri: sourceUrl }}
              onNavigationStateChange={handleNavigationStateChangeWithDedup}
              onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                const isInitialUrl = nativeEvent.url === sourceUrl;

                trackEvent(
                  createEventBuilder(
                    MetaMetricsEvents.RAMPS_CHECKOUT_HTTP_ERROR,
                  )
                    .addProperties({
                      location: 'WebviewModal',
                      ramp_type: 'UNIFIED_BUY_2',
                      url_path: redactUrlForAnalytics(nativeEvent.url),
                      status_code: nativeEvent.statusCode,
                      is_initial_url: isInitialUrl,
                    })
                    .build(),
                );

                if (isInitialUrl) {
                  const webviewHttpError = strings(
                    'deposit.webview_modal.error',
                    { code: nativeEvent.statusCode },
                  );
                  setWebviewError(webviewHttpError);
                }
              }}
              onMessage={__DEV__ ? handleWebViewMessage : undefined}
              injectedJavaScript={
                __DEV__ ? PROVIDER_EVENT_BRIDGE_SCRIPT : undefined
              }
              allowsInlineMediaPlayback
              enableApplePay
              paymentRequestEnabled
              mediaPlaybackRequiresUserAction={false}
            />
          )}
        </ScreenLayout.Body>
      </ScreenLayout>
    </BottomSheet>
  );
}

export default WebviewModal;
