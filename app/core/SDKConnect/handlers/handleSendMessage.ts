import { Platform } from 'react-native';
import Routes from '../../../../app/constants/navigation/Routes';
import AppConstants from '../../../../app/core/AppConstants';
import Logger from '../../../util/Logger';
import Device from '../../../util/device';
import { Minimizer } from '../../NativeModules';
import { Connection } from '../Connection';
import { METHODS_TO_DELAY } from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import { wait } from '../utils/wait.util';
import handleBatchRpcResponse from './handleBatchRpcResponse';

export const handleSendMessage = async ({
  msg,
  connection,
}: {
  msg: any;
  connection: Connection;
}) => {
  // Make sure loading modal is hidden
  connection.setLoading(false);

  const msgId = msg?.data?.id + '';
  const method = connection.rpcQueueManager.getId(msgId);
  // handle multichain rpc call responses separately
  const chainRPCs = connection.batchRPCManager.getById(msgId);
  if (chainRPCs) {
    await handleBatchRpcResponse({
      chainRpcs: chainRPCs,
      msg,
      batchRPCManager: connection.batchRPCManager,
      backgroundBridge: connection.backgroundBridge,
      sendMessage: ({ msg: newmsg }: { msg: any }) =>
        handleSendMessage({ msg: newmsg, connection }),
    });
  }

  if (msgId && method) {
    connection.rpcQueueManager.remove(msgId);
  }

  const canRedirect = connection.rpcQueueManager.canRedirect({ method });
  DevLogger.log(
    `Connection::sendMessage method=${method} trigger=${connection.trigger} id=${msgId} origin=${connection.origin} canRedirect=${canRedirect}`,
  );

  connection.remote.sendMessage(msg).catch((err) => {
    Logger.log(err, `Connection::sendMessage failed to send`);
  });

  if (connection.origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE) return;

  if (!canRedirect) {
    DevLogger.log(
      `Connection::sendMessage canDirect=false method=${method} --- skip goBack()`,
      connection.rpcQueueManager,
    );
    return;
  }

  if (connection.trigger !== 'deeplink') {
    DevLogger.log(`Connection::sendMessage NOT deeplink --- skip goBack()`);
    return;
  }

  try {
    if (METHODS_TO_DELAY[method]) {
      await wait(1200);
    }

    DevLogger.log(
      `Connection::sendMessage method=${method} trigger=${connection.trigger} origin=${connection.origin} id=${msgId} goBack()`,
    );

    // Trigger should be removed changed after redirect so we don't redirect the dapp next time and go back to nothing.
    connection.trigger = 'resume';

    // Check for iOS 17 and above to use a custom modal, as Minimizer.goBack() is incompatible with these versions
    if (Device.isIos() && parseInt(Platform.Version as string) >= 17) {
      connection.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.RETURN_TO_DAPP_MODAL,
      });
    } else {
      await Minimizer.goBack();
    }
  } catch (err) {
    Logger.log(
      err,
      `Connection::sendMessage error while waiting for empty rpc queue`,
    );
  }
};

export default handleSendMessage;
