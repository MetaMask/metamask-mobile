import { analytics } from '@metamask/sdk-analytics';
import { isAnalyticsTrackedRpcMethod } from '@metamask/sdk-communication-layer';
import Routes from '../../../../app/constants/navigation/Routes';
import AppConstants from '../../../../app/core/AppConstants';
import Logger from '../../../util/Logger';
import { Connection } from '../Connection';
import { METHODS_TO_DELAY, RPC_METHODS } from '../SDKConnectConstants';
import DevLogger from '../utils/DevLogger';
import { wait } from '../utils/wait.util';
import handleBatchRpcResponse from './handleBatchRpcResponse';

export const handleSendMessage = async ({
  msg,
  connection,
}: {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  msg: any;
  connection: Connection;
}) => {
  try {
    DevLogger.log(`[handleSendMessage] msg`, msg);
    connection.setLoading(false);

    const msgId = msg?.data?.id + '';
    let method = connection.rpcQueueManager.getId(msgId);
    const anonId = connection.originatorInfo?.anonId;

    if (
      isAnalyticsTrackedRpcMethod(method) &&
      msgId &&
      msgId !== 'undefined' &&
      anonId
    ) {
      if (msg?.data?.error) {
        DevLogger.log(
          `[MM SDK Analytics] event=wallet_action_user_rejected anonId=${anonId}`,
        );
        analytics.track('wallet_action_user_rejected', { anon_id: anonId });
      } else {
        DevLogger.log(
          `[MM SDK Analytics] event=wallet_action_user_approved anonId=${anonId}`,
        );
        analytics.track('wallet_action_user_approved', { anon_id: anonId });
      }
    }

    // handle multichain rpc call responses separately
    const chainRPCs = connection.batchRPCManager.getById(msgId);
    DevLogger.log(`[handleSendMessage] chainRPCs`, chainRPCs);
    if (chainRPCs) {
      const isLastRpcOrError = await handleBatchRpcResponse({
        chainRpcs: chainRPCs,
        msg,
        batchRPCManager: connection.batchRPCManager,
        backgroundBridge: connection.backgroundBridge,
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sendMessage: ({ msg: newmsg }: { msg: any }) =>
          handleSendMessage({ msg: newmsg, connection }),
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
      msg,
    );

    connection.remote.sendMessage(msg).catch((err) => {
      Logger.log(err, `Connection::sendMessage failed to send`);
    });

    if (connection.origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE) {
      DevLogger.log(
        `[handleSendMessage] origin=${connection.origin} --- skip goBack()`,
      );
      return;
    }

    if (!canRedirect) {
      DevLogger.log(
        `[handleSendMessage] canRedirect=false method=${method} --- skip goBack()`,
        connection.rpcQueueManager,
      );
      connection.setLoading(false);
      return;
      // const currentRoute = connection.navigation?.getCurrentRoute()?.name;
      // if (!method && currentRoute === 'AccountConnect') {
      //   DevLogger.log(`[handleSendMessage] remove modal`);
      //   if (
      //     Device.isIos() &&
      //     parseInt(Platform.Version as string) >= 17 &&
      //     connection.navigation?.canGoBack()
      //   ) {
      //     const isLastPendingRequest = connection.rpcQueueManager.isEmpty();
      //     if (!isLastPendingRequest) {
      //       DevLogger.log(
      //         `[handleSendMessage] pending request --- skip goback`,
      //       );
      //       return;
      //     }
      //     try {
      //       DevLogger.log(
      //         `[handleSendMessage] goBack()`,
      //         connection.navigation.getCurrentRoute(),
      //       );
      //       connection.navigation?.goBack();
      //       // Make sure there are no pending permissions requests before redirecting

      //       await wait(200); // delay to allow modal to close
      //       DevLogger.log(
      //         `[handleSendMessage] navigate to ROOT_MODAL_FLOW from ${currentRoute}`,
      //       );
      //     } catch (_e) {
      //       // Ignore temporarily until next stage of permissions system implementation
      //       DevLogger.log(`[handleSendMessage] error goBack()`, _e);
      //     }
      //     connection.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      //       screen: Routes.SHEET.RETURN_TO_DAPP_MODAL,
      //     });
      //   }
      // }
      // return;
    }

    if (
      connection.trigger !== 'deeplink' &&
      connection.origin !== AppConstants.DEEPLINKS.ORIGIN_DEEPLINK
    ) {
      DevLogger.log(`[handleSendMessage] NOT deeplink --- skip goBack()`);
      return;
    }

    // Add delay to display UI feedback before redirecting
    if (METHODS_TO_DELAY[method]) {
      await wait(1200);
    }

    DevLogger.log(
      `[handleSendMessage] method=${method} trigger=${connection.trigger} origin=${connection.origin} id=${msgId} goBack()`,
    );

    // Trigger should be removed after redirect so we don't redirect the dapp next time and go back to nothing.
    connection.trigger = 'resume';
    connection.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.RETURN_TO_DAPP_MODAL,
      isPostNetworkSwitch: method === RPC_METHODS.WALLET_SWITCHETHEREUMCHAIN,
    });
  } catch (err) {
    Logger.log(
      err,
      `Connection::sendMessage error while waiting for empty rpc queue`,
    );
  }
};

export default handleSendMessage;
