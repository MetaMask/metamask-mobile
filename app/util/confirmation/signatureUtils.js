import Engine from '../../core/Engine';
import { MetaMetricsEvents } from '../../core/Analytics';
import AnalyticsV2 from '../analyticsV2';
import { getAddressAccountType } from '../address';
import NotificationManager from '../../core/NotificationManager';
import { WALLET_CONNECT_ORIGIN } from '../walletconnect';
import AppConstants from '../../core/AppConstants';
import { InteractionManager } from 'react-native';
import { strings } from '../../../locales/i18n';

export const getAnalyticsParams = (messageParams, signType) => {
  try {
    const { currentPageInformation } = messageParams;
    const { NetworkController } = Engine.context;
    const { chainId } = NetworkController?.state?.providerConfig || {};
    const url = new URL(currentPageInformation?.url);
    return {
      account_type: getAddressAccountType(messageParams.from),
      dapp_host_name: url?.host,
      chain_id: chainId,
      sign_type: signType,
      version: messageParams?.version,
      ...currentPageInformation?.analytics,
    };
  } catch (error) {
    return {};
  }
};

export const walletConnectNotificationTitle = (confirmation, isError) => {
  if (isError) return strings('notifications.wc_signed_failed_title');
  return confirmation
    ? strings('notifications.wc_signed_title')
    : strings('notifications.wc_signed_rejected_title');
};

export const showWalletConnectNotification = (
  messageParams = {},
  confirmation = false,
  isError = false,
) => {
  InteractionManager.runAfterInteractions(() => {
    /**
     * FIXME: need to rewrite the way BackgroundBridge sets the origin.
     */
    const origin = messageParams.origin.toLowerCase().replaceAll(':', '');
    const isWCOrigin = origin.startsWith(
      WALLET_CONNECT_ORIGIN.replaceAll(':', '').toLowerCase(),
    );
    const isSDKOrigin = origin.startsWith(
      AppConstants.MM_SDK.SDK_REMOTE_ORIGIN.replaceAll(':', '').toLowerCase(),
    );

    if (isWCOrigin || isSDKOrigin) {
      NotificationManager.showSimpleNotification({
        status: `simple_notification${!confirmation ? '_rejected' : ''}`,
        duration: 5000,
        title: walletConnectNotificationTitle(confirmation, isError),
        description: strings('notifications.wc_description'),
      });
    }
  });
};

export const handleSignatureAction = async (
  onAction,
  messageParams,
  signType,
  confirmation,
) => {
  await onAction();
  showWalletConnectNotification(messageParams, confirmation);
  AnalyticsV2.trackEvent(
    confirmation
      ? MetaMetricsEvents.SIGN_REQUEST_COMPLETED
      : MetaMetricsEvents.SIGN_REQUEST_CANCELLED,
    getAnalyticsParams(messageParams, signType),
  );
};

export const addSignatureErrorListener = (metamaskId, onSignatureError) => {
  Engine.context.SignatureController.hub.on(
    `${metamaskId}:signError`,
    onSignatureError,
  );
};

export const removeSignatureErrorListener = (metamaskId, onSignatureError) => {
  Engine.context.SignatureController.hub.removeListener(
    `${metamaskId}:signError`,
    onSignatureError,
  );
};
