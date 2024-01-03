import { CommunicationLayerMessage } from '@metamask/sdk-communication-layer';
import { Connection } from '../Connection';
import { HOUR_IN_MS } from '../SDKConnectConstants';
import DevLogger from '../utils/DevLogger';
import AppConstants from '../../AppConstants';
import { ApprovalTypes } from '../../RPCMethods/RPCMethodMiddleware';
import { PreferencesController } from '@metamask/preferences-controller';
import { ApprovalController } from '@metamask/approval-controller';
import { Json } from '@metamask/utils';
import Engine from '../../Engine';

// TODO: should be more generic and be used in wallet connect and android service as well
export const checkPermissions = async ({
  connection,
  engine,
  lastAuthorized,
}: {
  connection: Connection;
  engine: typeof Engine;
  message?: CommunicationLayerMessage;
  lastAuthorized?: number;
}) => {
  const OTPExpirationDuration =
    Number(process.env.OTP_EXPIRATION_DURATION_IN_MS) || HOUR_IN_MS;

  const channelWasActiveRecently =
    !!lastAuthorized && Date.now() - lastAuthorized < OTPExpirationDuration;

  DevLogger.log(
    `SDKConnect checkPermissions initialConnection=${connection.initialConnection} lastAuthorized=${lastAuthorized} OTPExpirationDuration ${OTPExpirationDuration} channelWasActiveRecently ${channelWasActiveRecently}`,
  );
  // only ask approval if needed
  const approved = connection.isApproved({
    channelId: connection.channelId,
    context: 'checkPermission',
  });

  const preferencesController = (
    engine.context as { PreferencesController: PreferencesController }
  ).PreferencesController;
  const selectedAddress = preferencesController.state.selectedAddress;

  if (approved && selectedAddress) {
    return true;
  }

  const approvalController = (
    engine.context as { ApprovalController: ApprovalController }
  ).ApprovalController;

  if (connection.approvalPromise) {
    // Wait for result and clean the promise afterwards.
    await connection.approvalPromise;
    connection.approvalPromise = undefined;
    return true;
  }

  if (!connection.initialConnection && AppConstants.DEEPLINKS.ORIGIN_DEEPLINK) {
    connection.revalidate({ channelId: connection.channelId });
  }

  if (channelWasActiveRecently) {
    return true;
  }

  const approvalRequest = {
    origin: connection.origin,
    type: ApprovalTypes.CONNECT_ACCOUNTS,
    requestData: {
      hostname: connection.originatorInfo?.title ?? '',
      pageMeta: {
        channelId: connection.channelId,
        reconnect: !connection.initialConnection,
        origin: connection.origin,
        url: connection.originatorInfo?.url ?? '',
        title: connection.originatorInfo?.title ?? '',
        icon: connection.originatorInfo?.icon ?? '',
        otps: connection.otps ?? [],
        apiVersion: connection.originatorInfo?.apiVersion,
        analytics: {
          request_source: AppConstants.REQUEST_SOURCES.SDK_REMOTE_CONN,
          request_platform:
            connection.originatorInfo?.platform ??
            AppConstants.MM_SDK.UNKNOWN_PARAM,
        },
      } as Json,
    },
    id: connection.channelId,
  };
  connection.approvalPromise = approvalController.add(approvalRequest);

  await connection.approvalPromise;
  // Clear previous permissions if already approved.
  connection.revalidate({ channelId: connection.channelId });
  connection.approvalPromise = undefined;
  return true;
};

export default checkPermissions;
