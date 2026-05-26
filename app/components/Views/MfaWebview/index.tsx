import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';
import type { ShouldStartLoadRequest } from '@metamask/react-native-webview/lib/WebViewTypes';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Text,
  TextVariant,
  FontWeight,
  Button,
  ButtonVariant,
  ButtonSize,
  IconName,
} from '@metamask/design-system-react-native';
import { useParams } from '../../../util/navigation/navUtils';
import Logger from '../../../util/Logger';
import { strings } from '../../../../locales/i18n';
import { MfaWebviewService } from './MfaWebviewService';
import type { MfaWebviewParams } from './types';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import { MfaWebviewAuthService } from './MfaWebviewAuthService';

/**
 * MFA confirmation webview for the agentic-CLI flow (MMAI-138 / 175 / 176 / 177).
 *
 * Forked from `app/components/UI/Card/components/DaimoPayModal/DaimoPayModal.tsx`,
 * trimmed of dApp-specific machinery (BackgroundBridge, EIP-1193 injection,
 * polling backstop, transparent overlay, accounts-changed broadcast).
 *
 * Flow:
 * 1. Receives hosted approval page params via navigation (set by the deeplink
 * handler).
 * 2. Pulls an SRP Hydra token from `AuthenticationController`, exchanges it
 * for a dashboard auth token, and passes the dashboard token to the login
 * page in the URL fragment.
 * 3. Listens for `mm-cli-mfa` postMessage events; on `approved|rejected|close`,
 * navigates back. On `error`, shows an inline retry/close UI.
 */

const MfaWebview: React.FC = () => {
  const webViewRef = useRef<WebView>(null);
  const navigation = useNavigation();
  const tw = useTailwind();
  const {
    approvalPageLink,
    projectId,
    notificationId,
    requestId,
    approvalId,
    mimirSignature,
    operationType,
    subjectId,
    sessionId,
    server,
    intent,
  } = useParams<MfaWebviewParams>();
  const [error, setError] = useState<string | null>(null);
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const requestType = operationType ?? intent;
  const title =
    requestType === 'login'
      ? 'Sign in'
      : requestType === 'tx_approve'
        ? 'Approve transaction'
        : 'Review request';

  // Resolve the dashboard token once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await MfaWebviewAuthService.getAuthToken();
        if (cancelled) return;
        setAuthToken(token);
        const nextWebViewUrl = MfaWebviewService.buildWebViewUrl(
          {
            approvalPageLink,
            projectId,
            notificationId,
            requestId,
            approvalId,
            mimirSignature,
            operationType,
            subjectId,
            sessionId,
            server,
            intent,
          },
          token,
        );
        setWebViewUrl(nextWebViewUrl);
      } catch (err) {
        Logger.error(err as Error, 'MfaWebview: failed to obtain auth token');
        if (!cancelled)
          setError((err as Error).message || strings('error_message.unknown'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    approvalId,
    approvalPageLink,
    intent,
    mimirSignature,
    notificationId,
    operationType,
    projectId,
    requestId,
    server,
    sessionId,
    subjectId,
  ]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleMessage = useCallback(
    (messageEvent: WebViewMessageEvent) => {
      const event = MfaWebviewService.parseEvent(messageEvent.nativeEvent.data);
      if (!event) return;
      if (approvalId && event.approvalId !== approvalId) return;
      switch (event.type) {
        case 'approved':
        case 'rejected':
        case 'close':
          navigation.goBack();
          break;
        case 'error':
          setError(event.message);
          break;
      }
    },
    [approvalId, navigation],
  );

  const handleShouldStartLoadWithRequest = useCallback(
    (request: ShouldStartLoadRequest) => {
      if (request.isTopFrame === false) return true;
      if (MfaWebviewService.shouldLoadInWebView(request.url)) return true;
      Linking.openURL(request.url).catch((err) =>
        Logger.error(err as Error, 'MfaWebview: failed to open external URL'),
      );
      return false;
    },
    [],
  );

  const handleHttpError = useCallback(() => {
    setError(strings('error_message.unknown'));
  }, []);

  if (error) {
    return (
      <View
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
          onPress={handleClose}
        >
          {strings('navigation.close')}
        </Button>
      </View>
    );
  }

  if (!webViewUrl || !authToken) {
    // Brief blank state while we resolve the auth token; the WebView itself
    // shows a loading spinner once it starts.
    return <View style={tw.style('flex-1 bg-default')} />;
  }

  return (
    <>
      <HeaderCompactStandard
        title={title}
        onBack={() => navigation.goBack()}
        includesTopInset
        endButtonIconProps={[
          { iconName: IconName.Close, onPress: handleClose },
        ]}
      />
      <WebView
        ref={webViewRef}
        source={
          approvalPageLink
            ? { uri: webViewUrl }
            : {
                uri: webViewUrl,
                headers: { Authorization: `Bearer ${authToken}` },
              }
        }
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onError={handleHttpError}
        onHttpError={handleHttpError}
        javaScriptEnabled
        domStorageEnabled
        style={tw.style('flex-1 bg-default')}
        androidLayerType="hardware"
      />
    </>
  );
};

export default MfaWebview;
