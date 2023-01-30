import { InteractionManager } from 'react-native';
import { WALLET_CONNECT_ORIGIN } from '../../../../util/walletconnect';
import NotificationManager from '../../../../core/NotificationManager';
import { strings } from '../../../../../locales/i18n';
import { MM_SDK_REMOTE_ORIGIN } from '../../../../core/SDKConnect';
import { ShowWalletConnectProps } from '../types';

const showWalletConnectNotification = ({
  messageParams,
  isError,
  confirmation,
}: ShowWalletConnectProps) => {
  if (isError) return strings('notifications.wc_signed_failed_title');
  InteractionManager.runAfterInteractions(() => {
    messageParams.origin &&
      (messageParams.origin.startsWith(WALLET_CONNECT_ORIGIN) ||
        messageParams.origin.startsWith(MM_SDK_REMOTE_ORIGIN)) &&
      NotificationManager.showSimpleNotification({
        status: `simple_notification${!confirmation ? '_rejected' : ''}`,
        duration: 5000,
        title: confirmation
          ? strings('notifications.wc_signed_title')
          : strings('notifications.wc_signed_rejected_title'),
        description: strings('notifications.wc_description'),
      });
  });
};

export default showWalletConnectNotification;
