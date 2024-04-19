import { PermissionController } from '@metamask/permission-controller';
import { CommunicationLayerMessage } from '@metamask/sdk-communication-layer';
import Routes from '../../../../app/constants/navigation/Routes';
import AppConstants from '../../AppConstants';
import Engine from '../../Engine';
import { Connection } from '../Connection';
import { HOUR_IN_MS } from '../SDKConnectConstants';
import DevLogger from '../utils/DevLogger';
import { wait } from '../utils/wait.util';

// TODO: should be more generic and be used in wallet connect and android service as well
export const checkPermissions = async ({
  connection,
  engine,
  message,
  lastAuthorized,
}: {
  connection: Connection;
  engine: typeof Engine;
  message?: CommunicationLayerMessage;
  lastAuthorized?: number;
}) => {
  const OTPExpirationDuration =
    Number(process.env.OTP_EXPIRATION_DURATION_IN_MS) || HOUR_IN_MS;

  // close poientially open loading modal
  connection.setLoading(false);

  const channelWasActiveRecently =
    !!lastAuthorized && Date.now() - lastAuthorized < OTPExpirationDuration;

  DevLogger.log(
    `checkPermissions initialConnection=${connection.initialConnection} method=${message?.method} lastAuthorized=${lastAuthorized} OTPExpirationDuration ${OTPExpirationDuration} channelWasActiveRecently ${channelWasActiveRecently}`,
    connection.originatorInfo,
  );

  const permissionsController = (
    engine.context as { PermissionController: PermissionController<any, any> }
  ).PermissionController;

  // only ask approval if needed
  const approved = connection.isApproved({
    channelId: connection.channelId,
    context: 'checkPermission',
  });

  DevLogger.log(
    `checkPermissions approved=${approved} approvalPromise=${
      connection.approvalPromise !== undefined ? 'exists' : 'undefined'
    }`,
  );

  if (approved) {
    return true;
  }

  DevLogger.log(
    `checkPermissions channelWasActiveRecently=${channelWasActiveRecently} OTPExpirationDuration=${OTPExpirationDuration}`,
  );

  if (channelWasActiveRecently) {
    return true;
  }

  if (connection.approvalPromise) {
    const currentRouteName = connection.navigation?.getCurrentRoute()?.name;
    DevLogger.log(
      `checkPermissions approvalPromise exists currentRouteName=${currentRouteName}`,
    );
    // Make sure the window is displayed.
    const match = permissionsController.hasPermissions(connection.channelId);
    DevLogger.log(`checkPermissions match`, match);
    // Wait for result and clean the promise afterwards.

    // Only wait for approval if modal currently displayed
    if (currentRouteName === Routes.SHEET.ACCOUNT_CONNECT) {
      // Make sure the root is displayed
      connection.navigation?.navigate(Routes.SHEET.ACCOUNT_CONNECT);
      DevLogger.log(`checkPermissions approvalPromise exists -- WAIT`);
      const allowed = await connection.approvalPromise;
      DevLogger.log(
        `checkPermissions approvalPromise exists completed -- allowed`,
        allowed,
      );
      // Add delay for backgroundBridge to complete setup
      await wait(300);
      return allowed;
    }
    console.warn(`checkPermissions approvalPromise exists -- SKIP`);
  }

  if (!connection.initialConnection && AppConstants.DEEPLINKS.ORIGIN_DEEPLINK) {
    connection.revalidate({ channelId: connection.channelId });
  }

  try {
    const accountPermission = permissionsController.getPermission(
      connection.channelId,
      'eth_accounts',
    );
    if (!accountPermission) {
      connection.approvalPromise = permissionsController.requestPermissions(
        { origin: connection.channelId },
        { eth_accounts: {} },
        {
          preserveExistingPermissions: false,
        },
      );
    }

    await connection.approvalPromise;
    // Clear previous permissions if already approved.
    connection.revalidate({ channelId: connection.channelId });
    return true;
  } catch (err) {
    console.warn(`checkPermissions error`, err);
    connection.approvalPromise = undefined;
    throw err;
  }
};

export default checkPermissions;
