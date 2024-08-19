import Engine from '../../core/Engine';
import { MetaMetrics, MetaMetricsEvents } from '../../core/Analytics';
import { getAddressAccountType } from '../address';
import NotificationManager from '../../core/NotificationManager';
import { WALLET_CONNECT_ORIGIN } from '../walletconnect';
import AppConstants from '../../core/AppConstants';
import { InteractionManager } from 'react-native';
import { strings } from '../../../locales/i18n';
import { selectChainId } from '../../selectors/networkController';
import { store } from '../../store';
import { getBlockaidMetricsParams } from '../blockaid';
import Device from '../device';
import { getDecimalChainId } from '../networks';

export const typedSign = {
  V1: 'eth_signTypedData',
  V3: 'eth_signTypedData_v3',
  V4: 'eth_signTypedData_v4',
};

export const getAnalyticsParams = (
  messageParams,
  signType,
  securityAlertResponse,
) => {
  const { currentPageInformation, meta } = messageParams;
  const pageInfo = meta || currentPageInformation || {};

  try {
    const chainId = selectChainId(store.getState());
    const url = pageInfo.url && new URL(pageInfo?.url);

    let blockaidParams = {};
    if (securityAlertResponse) {
      blockaidParams = getBlockaidMetricsParams(securityAlertResponse);
    }

    return {
      account_type: getAddressAccountType(messageParams.from),
      dapp_host_name: url && url?.host,
      chain_id: getDecimalChainId(chainId),
      signature_type: signType,
      version: messageParams?.version,
      ...pageInfo?.analytics,
      ...blockaidParams,
    };
  } catch (error) {
    return {
      account_type: getAddressAccountType(messageParams.from),
      dapp_host_name: pageInfo.url || 'N/A',
      signature_type: signType,
      version: messageParams?.version,
      ...pageInfo?.analytics,
    };
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
  securityAlertResponse,
  confirmation,
) => {
  await onAction();
  showWalletConnectNotification(messageParams, confirmation);
  MetaMetrics.getInstance().trackEvent(
    confirmation
      ? MetaMetricsEvents.SIGNATURE_APPROVED
      : MetaMetricsEvents.SIGNATURE_REJECTED,
    getAnalyticsParams(messageParams, signType, securityAlertResponse),
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

export const shouldTruncateMessage = (e) => {
  if (
    (Device.isIos() && e.nativeEvent.layout.height > 70) ||
    (Device.isAndroid() && e.nativeEvent.layout.height > 100)
  ) {
    return true;
  }

  return false;
};
