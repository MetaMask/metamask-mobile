import { KeyringController } from '@metamask/keyring-controller';
import { PermissionController } from '@metamask/permission-controller';
import { CommunicationLayerMessage } from '@metamask/sdk-communication-layer';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../Engine';
import { getPermittedAccounts } from '../../Permissions';
import { Connection } from '../Connection';
import DevLogger from '../utils/DevLogger';
import {
  wait,
  waitForCondition,
  waitForKeychainUnlocked,
} from '../utils/wait.util';

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
    // close poientially open loading modal
    connection.setLoading(false);
    const currentRouteName = connection.navigation?.getCurrentRoute()?.name;

    DevLogger.log(
      `checkPermissions initialConnection=${connection.initialConnection} method=${message?.method} lastAuthorized=${lastAuthorized}`,
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

    // Make sure to wait for user to be on main pages before requesting permissions or request can get cancelled.
    const pendingRoutes = [Routes.LOCK_SCREEN, Routes.ONBOARDING.LOGIN];

    if (currentRouteName && pendingRoutes.includes(currentRouteName)) {
      await waitForCondition({
        fn: (): boolean => {
          const activeRoute = connection.navigation?.getCurrentRoute()?.name;
          return Boolean(activeRoute && !pendingRoutes.includes(activeRoute));
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
    const accounts = await getPermittedAccounts(connection.channelId);
    DevLogger.log(`checkPermissions approvalPromise completed`, res);
    return accounts.length > 0;
  } catch (err) {
    console.warn(`checkPermissions error`, err);
    connection.approvalPromise = undefined;
    throw err;
  }
};

export default checkPermissions;
