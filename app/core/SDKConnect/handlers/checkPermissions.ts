import { KeyringController } from '@metamask/keyring-controller';
import { PermissionController } from '@metamask/permission-controller';
import { CommunicationLayerMessage } from '@metamask/sdk-communication-layer';
import AppConstants from '../../AppConstants';
import Engine from '../../Engine';
import { getPermittedAccounts } from '../../Permissions';
import { Connection } from '../Connection';
import { HOUR_IN_MS } from '../SDKConnectConstants';
import DevLogger from '../utils/DevLogger';
import {
  wait,
  waitForCondition,
  waitForKeychainUnlocked,
} from '../utils/wait.util';
import Routes from '../../../constants/navigation/Routes';

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
  try {
    const OTPExpirationDuration =
      Number(process.env.OTP_EXPIRATION_DURATION_IN_MS) || HOUR_IN_MS;

    // close poientially open loading modal
    connection.setLoading(false);
    const currentRouteName = connection.navigation?.getCurrentRoute()?.name;

    const channelWasActiveRecently =
      !!lastAuthorized && Date.now() - lastAuthorized < OTPExpirationDuration;

    DevLogger.log(
      `checkPermissions initialConnection=${connection.initialConnection} method=${message?.method} lastAuthorized=${lastAuthorized} OTPExpirationDuration ${OTPExpirationDuration} channelWasActiveRecently ${channelWasActiveRecently}`,
      connection.originatorInfo,
    );

    const permittedAccounts = await getPermittedAccounts(connection.channelId);
    DevLogger.log(`checkPermissions permittedAccounts`, permittedAccounts);

    if (permittedAccounts.length > 0) {
      return true;
    }

    const permissionsController = (
      engine.context as {
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        PermissionController: PermissionController<any, any>;
      }
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

    DevLogger.log(
      `checkPermissions keychain unlocked -- route=${currentRouteName}`,
    );
    //FIXME Issue with KeyringController not being ready that thinks keychain is unlocked while the current route is still loading.
    if (currentRouteName === Routes.LOCK_SCREEN) {
      await waitForCondition({
        fn: () => {
          const activeRoute = connection.navigation?.getCurrentRoute()?.name;
          return activeRoute !== Routes.LOCK_SCREEN;
        },
        waitTime: 1000,
        context: 'checkPermissions',
      });
      // Add extra time on IOS since it takes longer to initialize keychain and detect that it is unlocked
    }

    // Wait for keychain to be unlocked before handling rpc calls.
    const keyringController = (
      engine.context as { KeyringController: KeyringController }
    ).KeyringController;

    await waitForKeychainUnlocked({
      keyringController,
      context: 'connection::on_message',
    });

    if (connection.approvalPromise) {
      DevLogger.log(
        `checkPermissions approvalPromise exists currentRouteName=${currentRouteName}`,
      );
      const allowed = await connection.approvalPromise;
      DevLogger.log(
        `checkPermissions approvalPromise exists completed -- allowed`,
        allowed,
      );
      // Add delay for backgroundBridge to complete setup
      await wait(300);
      return allowed;
    }

    if (
      !connection.initialConnection &&
      AppConstants.DEEPLINKS.ORIGIN_DEEPLINK
    ) {
      connection.revalidate({ channelId: connection.channelId });
    }

    const accountPermission = permissionsController.getPermission(
      connection.channelId,
      'eth_accounts',
    );
    const moreAccountPermission = permissionsController.getPermissions(
      connection.channelId,
    );
    DevLogger.log(
      `checkPermissions accountPermission`,
      accountPermission,
      moreAccountPermission,
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

    const res = await connection.approvalPromise;
    DevLogger.log(`checkPermissions approvalPromise completed`, res);
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
