import { MessageType, SendAnalytics, TrackingEvents } from '@metamask/sdk-communication-layer';
import { Platform } from 'react-native';
import { resetConnections } from '../../../../app/actions/sdk';
import { store } from '../../../../app/store';
import Routes from '../../../constants/navigation/Routes';
import { selectChainId } from '../../../selectors/networkController';
import Device from '../../../util/device';
import Engine from '../../Engine';
import { Minimizer } from '../../NativeModules';
import { getPermittedAccounts } from '../../Permissions';
import { Connection, ConnectionProps } from '../Connection';
import checkPermissions from '../handlers/checkPermissions';
import { DEFAULT_SESSION_TIMEOUT_MS } from '../SDKConnectConstants';
import DevLogger from '../utils/DevLogger';
import { SDKConnect } from './../SDKConnect';
import { wait, waitForCondition } from '../utils/wait.util';
import Logger from '../../../util/Logger';
import AppConstants from '../../AppConstants';

import packageJSON from '../../../../package.json';
const { version: walletVersion } = packageJSON;

async function connectToChannel({
  id,
  trigger,
  otherPublicKey,
  originatorInfo,
  protocolVersion,
  initialConnection,
  origin,
  validUntil = Date.now() + DEFAULT_SESSION_TIMEOUT_MS,
  instance,
}: ConnectionProps & {
  instance: SDKConnect;
}) {
  const existingConnection = instance.state.connected[id] !== undefined;
  const isReady = existingConnection && instance.state.connected[id].isReady;

  DevLogger.log(
    `SDKConnect::connectToChannel id=${id} trigger=${trigger} isReady=${isReady} existingConnection=${existingConnection}`,
  );

  if (isReady) {
    DevLogger.log(`SDKConnect::connectToChannel - INTERRUPT  - already ready`);
    // Nothing to do, already connected.
    return;
  }

  // Check if it was previously paused so that it first resume connection.
  if (existingConnection && !instance.state.paused) {
    DevLogger.log(
      `SDKConnect::connectToChannel -- CONNECTION SEEMS TO EXISTS ? --`,
    );
    // if paused --- wait for resume --- otherwise reconnect.
    await instance.reconnect({
      channelId: id,
      initialConnection: false,
      protocolVersion,
      trigger,
      otherPublicKey:
        instance.state.connected[id].remote.getKeyInfo()?.ecies.otherPubKey ??
        '',
      context: 'connectToChannel',
    });
    return;
  } else if (existingConnection && instance.state.paused) {
    DevLogger.log(
      `SDKConnect::connectToChannel - INTERRUPT - connection is paused`,
    );
    return;
  }

  instance.state.connecting[id] = true;

  try {
    instance.state.connections[id] = {
      id,
      otherPublicKey,
      origin,
      initialConnection,
      validUntil,
      originatorInfo,
      lastAuthorized: initialConnection ? 0 : instance.state.approvedHosts[id],
    };

    DevLogger.log(
      `SDKConnect connections[${id}]`,
      instance.state.connections[id],
    );

    const connected = new Connection({
      ...instance.state.connections[id],
      socketServerUrl: instance.state.socketServerUrl,
      protocolVersion,
      initialConnection,
      trigger,
      rpcQueueManager: instance.state.rpcqueueManager,
      originatorInfo,
      navigation: instance.state.navigation,
      updateOriginatorInfos: instance.updateOriginatorInfos.bind(instance),
      approveHost: instance._approveHost.bind(instance),
      disapprove: instance.disapproveChannel.bind(instance),
      getApprovedHosts: instance.getApprovedHosts.bind(instance),
      revalidate: instance.revalidateChannel.bind(instance),
      isApproved: instance.isApproved.bind(instance),
      onTerminate: ({
        channelId,
        sendTerminate,
      }: {
        channelId: string;
        sendTerminate?: boolean;
      }) => {
        instance.removeChannel({ channelId, sendTerminate });
      },
    });

    // Update state with local privateKey info, stored for relayPersistence
    const privateKey = connected.remote.getKeyInfo()?.ecies.private;
    instance.state.connections[id].privateKey = privateKey;
    instance.state.connections[id].protocolVersion = protocolVersion ?? 1;
    instance.state.connections[id].originatorInfo = originatorInfo;
    instance.state.connected[id] = connected;

    let authorized = false;
    DevLogger.log(
      `SDKConnect::connectToChannel - originatorInfo`,
      originatorInfo,
    );
    // Check permissions first
    if (originatorInfo) {
      // Only check permissions if we have originatorInfo with the deeplink (not available in protocol V1)
      DevLogger.log(
        `SDKConnect::connectToChannel checkPermissions`,
        originatorInfo,
      );

      try {
        // We cannot request permissions if the user is on the login screen or the account connect screen otherwise it will kill other permissions requests.
        const skipRoutes = [Routes.LOCK_SCREEN, Routes.ONBOARDING.LOGIN, Routes.SHEET.ACCOUNT_CONNECT];
        // Wait for login screen to be closed
        await waitForCondition({
          fn: () => {
            const currentRouteName = connected.navigation?.getCurrentRoute()?.name;
            DevLogger.log(`connectToChannel:: currentRouteName=${currentRouteName}`);
            return !!currentRouteName && !skipRoutes.includes(currentRouteName);
          },
          context: 'connectToChannel',
        });

        const res = await checkPermissions({
          connection: connected,
          engine: Engine,
        });
        DevLogger.log(`SDKConnect::connectToChannel - checkPermissions - authorized`, res);
        authorized = true;
      } catch (error) {
        DevLogger.log(`SDKConnect::connectToChannel - checkPermissions - error`, error);
        // first needs to connect without key exchange to send the event
        await instance.state.connected[id].remote.reject({channelId: id});
        // Send rejection event without awaiting
        SendAnalytics({id, event: TrackingEvents.REJECTED, ...originatorInfo}, instance.state.socketServerUrl).catch((err: Error) => {
          Logger.error(err, 'SendAnalytics failed');
        });

        instance.removeChannel({ channelId: id, sendTerminate: true });
        // cleanup connection
        await wait(100); // Add delay for connect modal to be fully closed
        await instance.updateSDKLoadingState({ channelId: id, loading: false });
        // Check for iOS 17 and above to use a custom modal, as Minimizer.goBack() is incompatible with these versions
        if (Device.isIos() && parseInt(Platform.Version as string) >= 17) {
          connected.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
            screen: Routes.SHEET.RETURN_TO_DAPP_MODAL,
          });
        } else {
          DevLogger.log(`[handleSendMessage] goBack()`);
          await Minimizer.goBack();
        }
        return;
      }
    }

    // SDK PROTOCOL pre 0.28.0
    DevLogger.log(`SDKConnect::connectToChannel - before connect`, instance.state.connected[id]);

    // Initialize connection
    await connected.connect({
      withKeyExchange: true,
      authorized,
    });
    DevLogger.log(`SDKConnect::connectToChannel - connected - state after connect`, instance.state);

    DevLogger.log(
      `SDKConnect::connectToChannel - connected - authorized=${authorized} initialConnection=${initialConnection}`,
    );
    if (authorized) {
      connected.remote.state.relayPersistence = true;
    }
    // Make sure to watch event before you connect
    instance.watchConnection(instance.state.connected[id]);
    store.dispatch(resetConnections(instance.state.connections));

    if (authorized && initialConnection) {
      const accounts = await getPermittedAccounts(id);
      const currentChainId = selectChainId(store.getState());
      connected.remote.state.channelId = id;
      const data = {
        accounts,
        chainId: currentChainId,
        walletVersion,
        deeplinkProtocol: true,
        walletKey:
          instance.state.connected[id].remote.getKeyInfo()?.ecies.public,
      };
      DevLogger.log(`Sending WALLET_INIT message to dapp`, data);
      // Directly send the account / chainId to the dapp
      await connected.remote.sendMessage({
        type: MessageType.WALLET_INIT,
        data,
      });

      // Make sure connect modal has enough time to fully close.
      await waitForCondition({
        fn: () => {
          const checkRoute = connected.navigation?.getCurrentRoute()?.name;
          return checkRoute !== Routes.SHEET.ACCOUNT_CONNECT;
        },
        context: 'connectToChannel',
        waitTime: 100,
      });

      await instance.updateSDKLoadingState({ channelId: id, loading: false });

      const currentRouteName = connected.navigation?.getCurrentRoute()?.name;
      DevLogger.log(
        `connectToChannel:: initialConnection=${initialConnection} trigger=${trigger} origin=${origin}  routeName: ${currentRouteName}`,
      );
      if (
        initialConnection &&
        connected.trigger === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK &&
        connected.origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK
      ) {
        if (Device.isIos() && parseInt(Platform.Version as string) >= 17) {
          DevLogger.log(`[handleSendMessage] display RETURN_TO_DAPP_MODAL`);
          connected.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
            screen: Routes.SHEET.RETURN_TO_DAPP_MODAL,
          });
        } else {
          await Minimizer.goBack();
        }
      }
    }
  } catch (error) {
    Logger.error(error as Error, 'Failed to connect to channel');
  } finally {
    DevLogger.log(`SDKConnect::connectToChannel - finally - state.connecting[${id}]=${instance.state.connecting[id]}`);
    instance.state.connecting[id] = false;
  }
}

export default connectToChannel;
