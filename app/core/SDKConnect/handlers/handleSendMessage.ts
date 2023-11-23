import Routes from '../../../../app/constants/navigation/Routes';
import AppConstants from '../../../../app/core/AppConstants';
import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import { Platform } from 'react-native';
import Logger from '../../../util/Logger';
import Device from '../../../util/device';
import { Minimizer } from '../../NativeModules';
import BatchRPCManager from '../BatchRPCManager';
import { Connection } from '../Connection';
import RPCQueueManager from '../RPCQueueManager';
import { METHODS_TO_DELAY } from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import { wait } from '../utils/wait.util';
import handleBatchRpcResponse from './handleBatchRpcResponse';

export const handleSendMessage = async ({
  msg,
  rpcQueueManager,
  backgroundBridge,
  batchRpcManager,
  connection,
}: {
  msg: any;
  rpcQueueManager: RPCQueueManager;
  backgroundBridge?: BackgroundBridge;
  batchRpcManager: BatchRPCManager;
  connection: Connection;
}) => {
  const msgId = msg?.data?.id + '';
  const needsRedirect = connection.requestsToRedirect[msgId] !== undefined;
  const method = rpcQueueManager.getId(msgId);

  DevLogger.log(`Connection::sendMessage`, msg);
  // handle multichain rpc call responses separately
  const chainRPCs = batchRpcManager.getById(msgId);
  if (chainRPCs) {
    await handleBatchRpcResponse({
      chainRpcs: chainRPCs,
      msg,
      connection,
      batchRpcManager,
      rpcQueueManager,
      backgroundBridge,
    });
    return;
  }

  if (msgId && method) {
    rpcQueueManager.remove(msgId);
  }

  connection.remote.sendMessage(msg).catch((err) => {
    Logger.log(err, `Connection::sendMessage failed to send`);
  });

  DevLogger.log(
    `Connection::sendMessage method=${method} trigger=${connection.trigger} id=${msgId} needsRedirect=${needsRedirect} origin=${connection.origin}`,
  );

  if (!needsRedirect) {
    return;
  }

  delete connection.requestsToRedirect[msgId];

  // hide modal
  connection.setLoading(false);

  if (connection.origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE) return;

  if (!rpcQueueManager.isEmpty()) {
    DevLogger.log(`Connection::sendMessage NOT empty --- skip goBack()`);
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
