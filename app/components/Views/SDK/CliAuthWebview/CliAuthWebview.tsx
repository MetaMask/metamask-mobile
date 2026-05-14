import React, { useCallback, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import {
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import { strings } from '../../../../../locales/i18n';
import { baseStyles } from '../../../../styles/common';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Logger from '../../../../util/Logger';
import {
  getCliAuthWebviewRequest,
  rejectCliAuthWebviewRequest,
  resolveCliAuthWebviewRequest,
} from '../../../../core/SDKConnectV2/services/cli-auth-webview-request-registry';

interface CliAuthWebviewRouteParams extends ParamListBase {
  CliAuthWebview: {
    requestId: string;
  };
}

interface CliAuthWebviewMessage {
  type: 'auth-token';
  authToken: string;
}

const CLI_AUTH_WEBVIEW_MOCK_DELAY_MS = 10_000;

const createCliAuthHtml = ({
  dashboardAccessToken,
  dappName,
}: {
  dashboardAccessToken: string;
  dappName: string;
}) => `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        align-items: center;
        background: white;
        color: rgb(36, 39, 42);
        display: flex;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        justify-content: center;
        margin: 0;
        min-height: 100vh;
        padding: 24px;
        text-align: center;
      }
      button {
        background: rgb(3, 125, 214);
        border: 0;
        border-radius: 8px;
        color: white;
        font-size: 16px;
        font-weight: 600;
        margin-top: 16px;
        padding: 12px 16px;
      }
      p {
        line-height: 1.45;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>CLI Auth</h1>
      <p id="description"></p>
      <button onclick="sendAuthToken()">Send auth token</button>
    </main>
    <script>
      const dashboardAccessToken = ${JSON.stringify(dashboardAccessToken)};
      const dappName = ${JSON.stringify(dappName)};

      document.getElementById('description').textContent =
        'Authorizing ' + dappName + ' with a temporary WebView. token=' + dashboardAccessToken;

      function sendAuthToken() {
        const authToken = 'mock-cli-auth-token-' + Date.now().toString(36);
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'auth-token',
          authToken,
          dashboardAccessTokenLength: dashboardAccessToken.length
        }));
      }

      setTimeout(sendAuthToken, ${CLI_AUTH_WEBVIEW_MOCK_DELAY_MS});
    </script>
  </body>
</html>
`;

const isCliAuthWebviewMessage = (
  message: unknown,
): message is CliAuthWebviewMessage => {
  if (
    message &&
    typeof message === 'object' &&
    'type' in message &&
    'authToken' in message
  ) {
    const candidate = message as Partial<CliAuthWebviewMessage>;

    return (
      candidate.type === 'auth-token' &&
      typeof candidate.authToken === 'string' &&
      candidate.authToken.length > 0
    );
  }

  return false;
};

const CliAuthWebview = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<CliAuthWebviewRouteParams, 'CliAuthWebview'>>();
  const requestId = route.params.requestId;
  const request = getCliAuthWebviewRequest(requestId);

  const html = useMemo(() => {
    if (!request) return '';

    return createCliAuthHtml({
      dashboardAccessToken: request.dashboardAccessToken,
      dappName: request.dappName,
    });
  }, [request]);

  useEffect(
    () => () => {
      rejectCliAuthWebviewRequest(
        requestId,
        new Error('CLI auth WebView was closed before completion'),
      );
    },
    [requestId],
  );

  useEffect(() => {
    if (!request) {
      navigation.goBack();
    }
  }, [navigation, request]);

  const handleMessage = useCallback(
    ({ nativeEvent }: WebViewMessageEvent) => {
      try {
        const message = JSON.parse(nativeEvent.data) as unknown;

        if (!isCliAuthWebviewMessage(message)) {
          throw new Error('Invalid CLI auth WebView message');
        }

        resolveCliAuthWebviewRequest(requestId, message.authToken);
        navigation.goBack();
      } catch (error) {
        Logger.error(
          error as Error,
          'Failed to process CLI auth WebView message',
        );
      }
    },
    [navigation, requestId],
  );

  if (!request) {
    return null;
  }

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <HeaderCompactStandard
        title={strings('sdk_connect_v2.cli_auth_webview.title')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <WebView
        containerStyle={baseStyles.flexGrow}
        onMessage={handleMessage}
        source={{ html }}
      />
    </View>
  );
};

export default CliAuthWebview;
