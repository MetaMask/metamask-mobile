import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';
import type {
  ShouldStartLoadRequest,
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
} from '@metamask/react-native-webview/lib/WebViewTypes';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import getHeaderCompactStandardNavbarOptions from '../../../component-library/components-temp/HeaderCompactStandard/getHeaderCompactStandardNavbarOptions';
import { strings } from '../../../../locales/i18n';
import Logger from '../../../util/Logger';
import { useParams } from '../../../util/navigation/navUtils';
import { AgenticCliDashboardWebviewService } from './AgenticCliDashboardWebviewService';
import type { AgenticCliDashboardWebviewParams } from './types';

const DASHBOARD_LOAD_ERROR_MESSAGE = strings(
  'sdk_connect_v2.agentic_cli_dashboard_webview.load_error',
);
const DASHBOARD_CLOSED_MESSAGE = strings(
  'sdk_connect_v2.agentic_cli_dashboard_webview.closed_error',
);

const redactUrlToken = (url?: string) => {
  if (!url) return undefined;

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.searchParams.has('auth_token')) {
      parsedUrl.searchParams.set('auth_token', '[REDACTED]');
    }

    if (parsedUrl.hash.includes('token=')) {
      parsedUrl.hash = parsedUrl.hash.replace(
        /((?:auth_)?token=)[^&]*/,
        '$1[REDACTED]',
      );
    }

    return parsedUrl.toString();
  } catch {
    return url
      .replace(/([?&]auth_token=)[^&\s]*/, '$1[REDACTED]')
      .replace(/#((?:auth_)?token=)[^&\s]*/, '#$1[REDACTED]');
  }
};

const AgenticCliDashboardWebview: React.FC = () => {
  const webViewRef = useRef<WebView>(null);
  const completedRef = useRef(false);
  const navigation = useNavigation();
  const tw = useTailwind();
  const { requestId, dashboardUrl, dashboardToken } =
    useParams<AgenticCliDashboardWebviewParams>();
  const [error, setError] = useState<string | null>(null);
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);

  const rejectOnce = useCallback(
    (message: string) => {
      if (completedRef.current) return;
      completedRef.current = true;
      AgenticCliDashboardWebviewService.reject(requestId, new Error(message));
    },
    [requestId],
  );

  const close = useCallback(() => {
    rejectOnce(DASHBOARD_CLOSED_MESSAGE);
    navigation.goBack();
  }, [navigation, rejectOnce]);

  useEffect(() => {
    try {
      const nextWebViewUrl = AgenticCliDashboardWebviewService.buildWebViewUrl(
        dashboardUrl,
        dashboardToken,
      );

      setWebViewUrl(nextWebViewUrl);
    } catch (err) {
      Logger.error(
        err as Error,
        'AgenticCliDashboardWebview: failed to build URL',
      );
      const message = (err as Error).message || DASHBOARD_LOAD_ERROR_MESSAGE;
      setError(message);
      rejectOnce(message);
    }
  }, [dashboardToken, dashboardUrl, rejectOnce]);

  useEffect(() => {
    navigation.setOptions(
      getHeaderCompactStandardNavbarOptions({
        title: strings('sdk_connect_v2.agentic_cli_dashboard_webview.title'),
        onBack: close,
        includesTopInset: true,
        twClassName: 'bg-default rounded-t-2xl',
      }),
    );
  }, [close, navigation]);

  useEffect(
    () => () => {
      rejectOnce(DASHBOARD_CLOSED_MESSAGE);
    },
    [rejectOnce],
  );

  const handleMessage = useCallback(
    (messageEvent: WebViewMessageEvent) => {
      const event = AgenticCliDashboardWebviewService.parseEvent(
        messageEvent.nativeEvent.data,
      );

      if (!event) return;

      switch (event.type) {
        case 'approved':
          completedRef.current = true;
          AgenticCliDashboardWebviewService.resolve(requestId, event.cliToken);
          navigation.goBack();
          break;
        case 'rejected':
        case 'close':
          close();
          break;
        case 'error':
          setError(event.message);
          rejectOnce(event.message);
          break;
      }
    },
    [close, navigation, rejectOnce, requestId],
  );

  const handleShouldStartLoadWithRequest = useCallback(
    (request: ShouldStartLoadRequest) => {
      if (AgenticCliDashboardWebviewService.shouldLoadInWebView(request.url)) {
        return true;
      }

      if (!request.isTopFrame) {
        return true;
      }

      const isExplicitUserNavigation =
        request.navigationType === 'click' ||
        request.navigationType === 'formsubmit' ||
        Platform.OS === 'android';

      if (!isExplicitUserNavigation) {
        return false;
      }

      Linking.openURL(request.url).catch((err) =>
        Logger.error(
          err as Error,
          'AgenticCliDashboardWebview: failed to open external URL',
        ),
      );
      return false;
    },
    [],
  );

  const failLoad = useCallback(() => {
    setError(DASHBOARD_LOAD_ERROR_MESSAGE);
    rejectOnce(DASHBOARD_LOAD_ERROR_MESSAGE);
  }, [rejectOnce]);

  const handleLoadError = useCallback(
    (event: WebViewErrorEvent) => {
      const { code, description, domain, url } = event.nativeEvent;
      const redactedUrl = redactUrlToken(url ?? webViewUrl ?? undefined);

      Logger.error(new Error(description || DASHBOARD_LOAD_ERROR_MESSAGE), {
        message: 'AgenticCliDashboardWebview: WebView load error',
        code,
        domain,
        url: redactedUrl,
      });
      failLoad();
    },
    [failLoad, webViewUrl],
  );

  const handleHttpError = useCallback(
    (event: WebViewHttpErrorEvent) => {
      const { description, statusCode, url } = event.nativeEvent;
      const redactedUrl = redactUrlToken(url ?? webViewUrl ?? undefined);

      Logger.error(new Error(description || DASHBOARD_LOAD_ERROR_MESSAGE), {
        message: 'AgenticCliDashboardWebview: WebView HTTP error',
        statusCode,
        url: redactedUrl,
      });
      failLoad();
    },
    [failLoad, webViewUrl],
  );

  if (error) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={tw.style(
          'flex-1 bg-default justify-center items-center p-4 gap-4',
        )}
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          twClassName="text-error-default text-center"
        >
          {error}
        </Text>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Md}
          onPress={close}
        >
          {strings('navigation.close')}
        </Button>
      </SafeAreaView>
    );
  }

  if (!webViewUrl) {
    return (
      <SafeAreaView edges={['bottom']} style={tw.style('flex-1 bg-default')} />
    );
  }

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <WebView
        ref={webViewRef}
        source={{
          uri: webViewUrl,
          headers: { Authorization: `Bearer ${dashboardToken}` },
        }}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onError={handleLoadError}
        onHttpError={handleHttpError}
        javaScriptEnabled
        domStorageEnabled
        style={tw.style('flex-1 bg-default')}
        androidLayerType="hardware"
      />
    </View>
  );
};

export default AgenticCliDashboardWebview;
