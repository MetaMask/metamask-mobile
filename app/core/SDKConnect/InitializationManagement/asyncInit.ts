import { NavigationContainerRef } from '@react-navigation/native';
import { disconnectAll, resetConnections } from '../../../../app/actions/sdk';
import { RootState } from '../../../../app/reducers';
import { store } from '../../../store';
import Logger from '../../../util/Logger';
import SDKConnect, { ApprovedHosts, SDKSessions } from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import { wait } from '../utils/wait.util';

const asyncInit = async ({
  navigation,
  instance,
  context,
}: {
  navigation: NavigationContainerRef;
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
    for (const id in sdk.connections) {
      const connInfo = sdk.connections[id];
      const ttl = sdk.approvedHosts[id] <= now;
      if (sdk.approvedHosts[id] <= now) {
        DevLogger.log(`Connection ${id} is still valid, TTL: ${ttl}`);
        // Only keep connections that are not expired.
        validConnections[id] = sdk.connections[id];
        validHosts[id] = sdk.approvedHosts[id];
      } else {
        // Remove expired connections
        DevLogger.log(
          `SDKConnect::init() - removing expired connection ${id}`,
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
    instance.state.androidConnections = sdk.androidConnections;

    // Update store with valid connection
    store.dispatch(resetConnections(validConnections));
    // All connectectiions are disconnected on start
    store.dispatch(disconnectAll());
    DevLogger.log(`SDKConnect::init() - done`);
    instance.state._initialized = true;
  } catch (err) {
    Logger.log(err, `SDKConnect::init() - error loading connections`);
  }
};

export default asyncInit;
