import { InteractionManager } from 'react-native';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import NotificationManager from '../../../core/NotificationManager';
import { strings } from '../../../../locales/i18n';
import { MM_SDK_REMOTE_ORIGIN } from '../../../core/SDKConnect';
import Engine from '../../../core/Engine';
import { UseMessageProps } from './useSignatureTypes';

const showWalletConnectNotification = ({
  messageParams,
  isError,
  confirmation,
}: any) => {
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

const useMessage = ({ messageParams, type }: UseMessageProps) => {
  const { TypedMessageManager, KeyringController }: any = Engine.context;

  const signMessage = async () => {
    const messageId = messageParams.metamaskId;
    const version = messageParams.version;
    let rawSig;
    let cleanMessageParams;
    try {
      cleanMessageParams = await TypedMessageManager.approveMessage(
        messageParams,
      );
      rawSig = await KeyringController.signTypedMessage(
        cleanMessageParams,
        version,
      );
      TypedMessageManager.setMessageStatusSigned(messageId, rawSig);
      showWalletConnectNotification({
        confirmation: true,
        messageParams,
        isError: false,
      });
    } catch (error: any) {
      TypedMessageManager.setMessageStatusSigned(messageId, error?.message);
      showWalletConnectNotification({
        confirmation: false,
        messageParams,
        isError: true,
      });
    }
  };

  const rejectMessage = () => {
    const messageId = messageParams.metamaskId;
    if (type === 'typed') TypedMessageManager.rejectMessage(messageId);
    showWalletConnectNotification({
      confirmation: false,
      messageParams,
      isError: false,
    });
  };

  return [rejectMessage, signMessage];
};

export default useMessage;
