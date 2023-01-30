import Engine from '../../../core/Engine';
import { UseMessageProps } from './useSignatureTypes';
import {showWalletConnectNotification} from '../../UI/SignatureRequest/Util'

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
