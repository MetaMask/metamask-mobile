import { PermissionController } from '@metamask/permission-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import { CommunicationLayerMessage } from '@metamask/sdk-communication-layer';
import { getPermittedAccounts } from '../../../core/Permissions';
import AppConstants from '../../AppConstants';
import Engine from '../../Engine';
import { Connection } from '../Connection';
import { HOUR_IN_MS } from '../SDKConnectConstants';
import DevLogger from '../utils/DevLogger';

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
    `checkPermissions initialConnection=${connection.initialConnection} lastAuthorized=${lastAuthorized} OTPExpirationDuration ${OTPExpirationDuration} channelWasActiveRecently ${channelWasActiveRecently}`,
    connection.originatorInfo,
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

  const permissionsController = (
    engine.context as { PermissionController: PermissionController<any, any> }
  ).PermissionController;

  if (connection.approvalPromise) {
    DevLogger.log(`checkPermissions approvalPromise exists`);
    // Make sure the window is displayed.
    const match = permissionsController.hasPermissions(connection.channelId);
    DevLogger.log(`checkPermissions match`, match);
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

  const origin = connection.channelId;
  const acc = await getPermittedAccounts(origin);
  if (acc.length > 0) {
    DevLogger.log(
      `checkPermissions acc founds length=${acc.length} -- APPROVED`,
    );
    return true;
  }

  DevLogger.log(`checkPermissions request permissions`, acc);
  connection.approvalPromise = permissionsController.requestPermissions(
    { origin },
    { eth_accounts: {} },
    { id: connection.channelId },
  );

  try {
    await connection.approvalPromise;
    // Clear previous permissions if already approved.
    connection.revalidate({ channelId: connection.channelId });
    connection.approvalPromise = undefined;
    return true;
  } catch (err) {
    DevLogger.log(`checkPermissions error`, err);
    connection.approvalPromise = undefined;
    throw err;
  }
};

export default checkPermissions;
