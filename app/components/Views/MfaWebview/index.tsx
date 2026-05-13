import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Text,
  TextVariant,
  FontWeight,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import getHeaderCompactStandardNavbarOptions from '../../../component-library/components-temp/HeaderCompactStandard/getHeaderCompactStandardNavbarOptions';
import { useParams } from '../../../util/navigation/navUtils';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import Device from '../../../util/device';
import { strings } from '../../../../locales/i18n';
import { MfaWebviewService } from './MfaWebviewService';
import type { MfaWebviewParams } from './types';

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
 * 2. Pulls a bearer token from `AuthenticationController` and bakes it into
 * both the `Authorization` header AND the URL fragment (so the SPA's
 * same-origin XHR can keep using it).
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
    operationType,
    subjectId,
    sessionId,
    server,
    intent,
  } = useParams<MfaWebviewParams>();
  const [error, setError] = useState<string | null>(null);
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [bearerToken, setBearerToken] = useState<string | null>(null);

  // Wire a top bar with title + close button (mirrors SimpleWebview pattern).
  useEffect(() => {
    const title =
      (operationType ?? intent) === 'tx_approve'
        ? 'Approve transaction'
        : 'Sign in';
    navigation.setOptions(
      getHeaderCompactStandardNavbarOptions({
        title,
        onBack: () => navigation.goBack(),
        includesTopInset: Device.isAndroid(),
        twClassName: 'bg-default rounded-t-2xl',
      }),
    );
  }, [navigation, operationType, intent]);

  // Resolve the bearer once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token =
          await Engine.context.AuthenticationController.getBearerToken();
        if (cancelled) return;
        if (!token)
          throw new Error('No bearer token available — is the user signed in?');
        setBearerToken(token);
        setWebViewUrl(
          MfaWebviewService.buildWebViewUrl(
            {
              approvalPageLink,
              projectId,
              notificationId,
              requestId,
              approvalId,
              operationType,
              subjectId,
              sessionId,
              server,
              intent,
            },
            token,
          ),
        );
      } catch (err) {
        Logger.error(err as Error, 'MfaWebview: failed to obtain bearer token');
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
    (request: { url: string }) => {
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
          onPress={handleClose}
        >
          {strings('navigation.close')}
        </Button>
      </SafeAreaView>
    );
  }

  if (!webViewUrl || !bearerToken) {
    // Brief blank state while we resolve the bearer; the WebView itself
    // shows a loading spinner once it starts.
    return (
      <SafeAreaView edges={['bottom']} style={tw.style('flex-1 bg-default')} />
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={tw.style('flex-1 bg-default')}>
      <WebView
        ref={webViewRef}
        source={{
          uri: webViewUrl,
          headers: { Authorization: `Bearer ${bearerToken}` },
        }}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onError={handleHttpError}
        onHttpError={handleHttpError}
        javaScriptEnabled
        domStorageEnabled
        style={tw.style('flex-1 bg-default')}
        androidLayerType="hardware"
      />
    </SafeAreaView>
  );
};

export default MfaWebview;
