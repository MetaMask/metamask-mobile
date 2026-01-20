import { KeyringController } from '@metamask/keyring-controller';
import { PermissionController } from '@metamask/permission-controller';
import { CommunicationLayerMessage } from '@metamask/sdk-communication-layer';
import {
  Caip25EndowmentPermissionName,
  Caip25CaveatType,
} from '@metamask/chain-agnostic-permission';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../Engine';
import {
  getDefaultCaip25CaveatValue,
  getPermittedAccounts,
} from '../../Permissions';
import { Connection } from '../Connection';
import DevLogger from '../utils/DevLogger';
import {
  wait,
  waitForCondition,
  waitForKeychainUnlocked,
} from '../utils/wait.util';
import { Platform } from 'react-native';

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

    const permittedAccounts = getPermittedAccounts(connection.channelId);
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
    const pendingRoutes: string[] = [
      Routes.LOCK_SCREEN,
      Routes.ONBOARDING.LOGIN,
    ];

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

    const caip25Permission = permissionsController.getPermission(
      connection.channelId,
      Caip25EndowmentPermissionName,
    );
    const moreAccountPermission = permissionsController.getPermissions(
      connection.channelId,
    );
    DevLogger.log(
      `checkPermissions caip25Permission`,
      caip25Permission,
      moreAccountPermission,
    );
    if (!caip25Permission) {
      connection.approvalPromise = permissionsController.requestPermissions(
        { origin: connection.channelId },
        {
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: getDefaultCaip25CaveatValue(),
              },
            ],
          },
        },
        {
          preserveExistingPermissions: false,
        },
      );
    }

    const res = await connection.approvalPromise;
    if (Platform.OS === 'ios') {
      // A UI crash happening on ios from AccountConnect.tsx which is triggered by permissionsController.getPermission().
      // Seems to be a race condition between the connect being accepted and the approvalPromise being resolved.
      // Adding a small delay seems to fix the issue.
      // *** Assertion failure in -[RCTNativeAnimatedNodesManager disconnectAnimatedNodes:childTag:](), metamask-mobile/node_modules/react-native/Libraries/NativeAnimation/RCTNativeAnimatedNodesManager.m:142
      // Exception thrown while executing UI block: 'childNode' is a required parameter
      // 0x14146e100 - GPUProcessProxy::gpuProcessExited: reason=IdleExit
      await wait(100);
    }
    const accounts = getPermittedAccounts(connection.channelId);
    DevLogger.log(`checkPermissions approvalPromise completed`, res);
    return accounts.length > 0;
  } catch (err) {
    console.warn(`checkPermissions error`, err);
    connection.approvalPromise = undefined;
    throw err;
  }
};

export default checkPermissions;
