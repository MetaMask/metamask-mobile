import { Platform } from 'react-native';
import Routes from '../../../../app/constants/navigation/Routes';
import AppConstants from '../../../../app/core/AppConstants';
import Logger from '../../../util/Logger';
import Device from '../../../util/device';
import { Minimizer } from '../../NativeModules';
import { Connection } from '../Connection';
import { METHODS_TO_DELAY, RPC_METHODS } from '../SDKConnectConstants';
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
  DevLogger.log(`[handleSendMessage] msg`, msg);
  connection.setLoading(false);

  const msgId = msg?.data?.id + '';
  let method = connection.rpcQueueManager.getId(msgId);
  // handle multichain rpc call responses separately
  const chainRPCs = connection.batchRPCManager.getById(msgId);
  DevLogger.log(`[handleSendMessage] chainRPCs`, chainRPCs);
  if (chainRPCs) {
    const isLastRpcOrError = await handleBatchRpcResponse({
      chainRpcs: chainRPCs,
      msg,
      batchRPCManager: connection.batchRPCManager,
      backgroundBridge: connection.backgroundBridge,
      sendMessage: ({ msg: newmsg }: { msg: any }) => {
        DevLogger.log(`[handleSendMessage] initial msg`, msg);
        DevLogger.log(`[handleSendMessage]     new msg`, newmsg);
        return handleSendMessage({ msg: newmsg, connection });
      },
    });

    // check if lastrpc or if an error occured during the chain
    if (!isLastRpcOrError) {
      // Only continue processing the message and goback if all rpcs in the batch have been handled
      DevLogger.log(
        `[handleSendMessage] chainRPCs=${chainRPCs} NOT COMPLETED!`,
      );
      return;
    }

    // Always set the method to metamask_batch otherwise it may not have been set correctly because of the batch rpc flow.
    method = RPC_METHODS.METAMASK_BATCH;
    DevLogger.log(`[handleSendMessage] chainRPCs=${chainRPCs} COMPLETED!`);
  }

  if (msgId && method) {
    connection.rpcQueueManager.remove(msgId);
  }

  const canRedirect = connection.rpcQueueManager.canRedirect({ method });
  DevLogger.log(
    `[handleSendMessage] method=${method} trigger=${connection.trigger} id=${msgId} origin=${connection.origin} canRedirect=${canRedirect}`,
  );

  connection.remote.sendMessage(msg).catch((err) => {
    Logger.log(err, `Connection::sendMessage failed to send`);
  });

  if (connection.origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE) return;

  if (!canRedirect) {
    DevLogger.log(
      `[handleSendMessage] canDirect=false method=${method} --- skip goBack()`,
      connection.rpcQueueManager,
    );
    return;
  }

  if (connection.trigger !== 'deeplink') {
    DevLogger.log(`[handleSendMessage] NOT deeplink --- skip goBack()`);
    return;
  }

  try {
    if (METHODS_TO_DELAY[method]) {
      await wait(1200);
    }

    DevLogger.log(
      `[handleSendMessage] method=${method} trigger=${connection.trigger} origin=${connection.origin} id=${msgId} goBack()`,
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
