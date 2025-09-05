import {
  disconnectAll,
  resetApprovedHosts,
  resetConnections,
} from '../../../../app/actions/sdk';
import { RootState } from '../../../../app/reducers';
import { store } from '../../../store';
import Logger from '../../../util/Logger';
import SDKConnect, { ApprovedHosts, SDKSessions } from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import { wait } from '../utils/wait.util';
import AppConstants from '../../../../app/core/AppConstants';

const asyncInit = async ({
  navigation,
  instance,
  context,
}: {
  navigation: TypedNavigationContainerRef;
  instance: SDKConnect;
  context?: string;
}) => {
  instance.state.navigation = navigation;
  DevLogger.log(`SDKConnect::init()[${context}] - starting`);

  // Ignore initial call to _handleAppState since it is first initialization.
  instance.state.appState = 'active';

  // When restarting from being killed, keyringController might be mistakenly restored on unlocked=true so we need to wait for it to get correct state.
  await wait(1000);
  DevLogger.log(`SDKConnect::init() - waited 1000ms - keep initializing`);

  const { sdk } = store.getState() as RootState;
  const validConnections: SDKSessions = {};
  const validHosts: ApprovedHosts = {};
  try {
    // Remove connections that have expired.
    const now = Date.now();
    const connectionsLength = Object.keys(sdk.connections).length;
    const approvedHostsLength = Object.keys(sdk.approvedHosts).length;
    DevLogger.log(
      `SDKConnect::init() - connections length=${connectionsLength} approvedHosts length=${approvedHostsLength}`,
    );
    for (const id in sdk.connections) {
      const connInfo = sdk.connections[id];
      const sdkHostId = AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + id;
      const ttl = (connInfo.validUntil ?? 0) - now;
      DevLogger.log(
        `Checking connection ${id} sdkHostId=${sdkHostId} TTL=${ttl} validUntil=${
          connInfo.validUntil ?? 0
        } hostValue:${sdk.approvedHosts[sdkHostId]} now: ${now}`,
        sdk.approvedHosts,
      );
      if (ttl > 0) {
        DevLogger.log(
          `Connection ${id} / ${sdkHostId} is still valid, TTL: ${ttl}`,
        );
        // Only keep connections that are not expired.
        validConnections[id] = sdk.connections[id];
        validHosts[sdkHostId] = sdk.approvedHosts[sdkHostId];
      } else {
        // Remove expired connections
        DevLogger.log(
          `SDKConnect::init() - removing expired connection ${id} ${sdkHostId}`,
          connInfo,
        );
      }
    }
    DevLogger.log(
      `SDKConnect::init() - valid connections length=${
        Object.keys(validConnections).length
      }`,
      validConnections,
    );
    instance.state.connections = validConnections;
    instance.state.approvedHosts = validHosts;
    instance.state.dappConnections = sdk.dappConnections;

    // Update store with valid connection
    store.dispatch(resetConnections(validConnections));
    store.dispatch(resetApprovedHosts(validHosts));
    // All connectectiions are disconnected on start
    store.dispatch(disconnectAll());
    DevLogger.log(`SDKConnect::init() - done`);
    instance.state._initialized = true;
  } catch (err) {
    Logger.log(err, `SDKConnect::init() - error loading connections`);
  }
};

export default asyncInit;
