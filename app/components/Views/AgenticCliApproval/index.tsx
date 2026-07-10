import React, { useCallback, useEffect, useState } from 'react';
import { Image, Linking, View } from 'react-native';
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
import { shouldWaitForAgenticCliMwpConnection } from '../../../core/AgenticCli/agenticCliConnectionRequest';
import { waitForAgenticCliLoginConnectionEstablished } from '../../../core/AgenticCli/agenticCliConnectionSession';
import { AgenticCliApprovalService } from './AgenticCliApprovalService';
import type { AgenticCliApprovalParams } from './types';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import FOX from '../../../images/branding/fox.png';

interface AgenticCliApprovalErrorState {
  title: string;
  description: string;
  details?: string;
  canRetry: boolean;
}

interface WebViewLoadErrorEvent {
  nativeEvent?: {
    description?: string;
    statusCode?: number;
    url?: string;
  };
}

const getErrorDetails = (err: unknown): string | undefined =>
  err instanceof Error ? err.message : undefined;

const getLoadErrorState = (details?: string): AgenticCliApprovalErrorState => ({
  title: strings('agentic_cli_approval.error.title'),
  description: strings('agentic_cli_approval.error.load_description'),
  details,
  canRetry: true,
});

const getSubmitErrorState = (
  details?: string,
): AgenticCliApprovalErrorState => ({
  title: strings('agentic_cli_approval.error.title'),
  description: strings('agentic_cli_approval.error.submit_description'),
  details,
  canRetry: false,
});

const getLoadErrorDetails = ({
  description,
  statusCode,
}: {
  description?: string;
  statusCode?: number;
}) => {
  const statusLabel =
    statusCode && statusCode > 0 ? `HTTP ${statusCode}` : undefined;

  return [statusLabel, description].filter(Boolean).join(' - ') || undefined;
};

/**
 * Agentic CLI approval webview (MMAI-138 / 175 / 176 / 177).
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
 * navigates back. On `error`, shows a generic error UI with secondary details.
 */

const AgenticCliApproval: React.FC = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const {
    approvalPagePath,
    projectId,
    approvalId,
    mimirSignature,
    operationType,
    subjectId,
  } = useParams<AgenticCliApprovalParams>();
  const [error, setError] = useState<AgenticCliApprovalErrorState | null>(null);
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const title = strings('agentic_cli_approval.title');

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const renderHeader = () => (
    <HeaderCompactStandard
      title={title}
      onBack={handleClose}
      includesTopInset
      endButtonIconProps={[{ iconName: IconName.Close, onPress: handleClose }]}
    />
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (shouldWaitForAgenticCliMwpConnection(operationType)) {
          await waitForAgenticCliLoginConnectionEstablished();
        }

        const token = await AgenticCliApprovalService.getAuthToken();
        if (cancelled) return;
        const nextWebViewUrl = AgenticCliApprovalService.buildWebViewUrl(
          {
            approvalPagePath,
            projectId,
            approvalId,
            mimirSignature,
            operationType,
            subjectId,
          },
          token,
        );
        setWebViewUrl(nextWebViewUrl);
      } catch (err) {
        Logger.error(
          err as Error,
          'AgenticCliApproval: failed to obtain auth token',
        );
        if (!cancelled) setError(getLoadErrorState(getErrorDetails(err)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    approvalId,
    approvalPagePath,
    mimirSignature,
    projectId,
    operationType,
    retryKey,
    subjectId,
  ]);

  const handleMessage = useCallback(
    (messageEvent: WebViewMessageEvent) => {
      const event = AgenticCliApprovalService.parseEvent(
        messageEvent.nativeEvent.data,
      );
      if (!event) return;
      if (approvalId && event.approvalId !== approvalId) return;
      switch (event.type) {
        case 'approved':
        case 'rejected':
        case 'close':
          navigation.goBack();
          break;
        case 'error':
          Logger.error(
            new Error(event.message),
            'AgenticCliApproval: hosted approval page reported an error',
          );
          setError(getSubmitErrorState(event.message));
          break;
      }
    },
    [approvalId, navigation],
  );

  const handleShouldStartLoadWithRequest = useCallback(
    (request: ShouldStartLoadRequest) => {
      if (AgenticCliApprovalService.shouldLoadInWebView(request.url))
        return true;
      if (request.isTopFrame === true) {
        Linking.openURL(request.url).catch((err) =>
          Logger.error(
            err as Error,
            'AgenticCliApproval: failed to open external URL',
          ),
        );
      }
      return false;
    },
    [],
  );

  const handleWebViewLoadError = useCallback(
    (event?: WebViewLoadErrorEvent) => {
      const { description, statusCode, url } = event?.nativeEvent ?? {};
      Logger.error(new Error(description ?? 'WebView failed to load'), {
        message: 'AgenticCliApproval: WebView load failed',
        statusCode,
        url,
      });
      setError(
        getLoadErrorState(getLoadErrorDetails({ description, statusCode })),
      );
    },
    [],
  );

  const handleRetry = useCallback(() => {
    setError(null);
    setWebViewUrl(null);
    setRetryKey((currentRetryKey) => currentRetryKey + 1);
  }, []);

  if (error) {
    return (
      <>
        {renderHeader()}
        <View
          style={tw.style(
            'flex-1 bg-default justify-center items-center px-6 gap-4',
          )}
          testID="agentic-cli-approval-error-container"
        >
          <Image
            source={FOX}
            style={tw.style('w-[110px] h-[110px] mb-1')}
            resizeMode="contain"
          />
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            twClassName="text-default text-center"
            testID="agentic-cli-approval-error-title"
          >
            {error.title}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            twClassName="text-alternative text-center"
            testID="agentic-cli-approval-error-description"
          >
            {error.description}
          </Text>
          {error.details ? (
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Regular}
              twClassName="text-muted text-center"
              testID="agentic-cli-approval-error-details"
            >
              {error.details}
            </Text>
          ) : null}
          <View style={tw.style('flex-row gap-3 mt-2')}>
            <Button
              variant={
                error.canRetry ? ButtonVariant.Secondary : ButtonVariant.Primary
              }
              size={ButtonSize.Md}
              onPress={handleClose}
              testID="agentic-cli-approval-close-button"
            >
              {strings('navigation.close')}
            </Button>
            {error.canRetry ? (
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Md}
                onPress={handleRetry}
                testID="agentic-cli-approval-retry-button"
              >
                {strings('agentic_cli_approval.error.try_again')}
              </Button>
            ) : null}
          </View>
        </View>
      </>
    );
  }

  if (!webViewUrl) {
    return <View style={tw.style('flex-1 bg-default')} />;
  }

  return (
    <>
      {renderHeader()}
      <WebView
        source={{ uri: webViewUrl }}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onError={handleWebViewLoadError}
        onHttpError={handleWebViewLoadError}
        javaScriptEnabled
        domStorageEnabled
        style={tw.style('flex-1 bg-default')}
        androidLayerType="hardware"
        testID="agentic-cli-approval"
      />
    </>
  );
};

export default AgenticCliApproval;
