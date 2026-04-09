import { MetaMetricsEvents } from '../../Analytics';
import { analytics } from '../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import Logger from '../../../util/Logger';
import { Connection } from '../Connection';
import {
  ANALYTICS_TRACKED_RPC_METHODS,
  RPC_METHODS,
} from '../SDKConnectConstants';
import DevLogger from '../utils/DevLogger';
import handleBatchRpcResponse from './handleBatchRpcResponse';
import Routes from '../../../constants/navigation/Routes';

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
      ANALYTICS_TRACKED_RPC_METHODS.includes(method) &&
      msgId &&
      msgId !== 'undefined' &&
      anonId
    ) {
      const event = msg?.data?.error
        ? MetaMetricsEvents.REMOTE_CONNECTION_RPC_REQUEST_REJECTED
        : MetaMetricsEvents.REMOTE_CONNECTION_RPC_REQUEST_APPROVED;

      DevLogger.log(
        `[MM SDK Analytics] event=${event.category} anonId=${anonId}`,
      );

      analytics.trackEvent(
        AnalyticsEventBuilder.createEventBuilder(event)
          .addProperties({
            transport_type: 'socket_relay',
            sdk_version: connection.originatorInfo?.apiVersion,
            rpc_method: method,
          })
          .addSensitiveProperties({ remote_session_id: anonId })
          .build(),
      );
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

    connection.remote.sendMessage(msg).catch((err) => {
      Logger.log(err, `Connection::sendMessage failed to send`);
    });

    if (method) {
      connection.trigger = 'resume';
      connection.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SDK.RETURN_TO_DAPP_NOTIFICATION,
        method,
        origin: connection.originatorInfo?.url,
        hideReturnToApp: connection.hideReturnToApp,
      });
    }
  } catch (err) {
    Logger.log(
      err,
      `Connection::sendMessage error while waiting for empty rpc queue`,
    );
  }
};

export default handleSendMessage;
