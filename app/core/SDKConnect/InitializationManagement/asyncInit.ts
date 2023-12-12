import { NavigationContainerRef } from '@react-navigation/native';
import DefaultPreference from 'react-native-default-preference';
import AppConstants from '../../AppConstants';
import Logger from '../../../util/Logger';
import SDKConnect, { ApprovedHosts } from '../SDKConnect';
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

  try {
    DevLogger.log(`SDKConnect::init() - loading connections`);
    // On Android the DefaultPreferences will start loading after the biometrics
    const [connectionsStorage, hostsStorage] = await Promise.all([
      DefaultPreference.get(AppConstants.MM_SDK.SDK_CONNECTIONS),
      DefaultPreference.get(AppConstants.MM_SDK.SDK_APPROVEDHOSTS),
    ]);

    DevLogger.log(
      `SDKConnect::init() - connectionsStorage=${connectionsStorage} hostsStorage=${hostsStorage}`,
    );

    if (connectionsStorage) {
      instance.state.connections = JSON.parse(connectionsStorage);
      DevLogger.log(
        `SDKConnect::init() - connections [${
          Object.keys(instance.state.connections).length
        }]`,
      );
    }

    if (hostsStorage) {
      const uncheckedHosts = JSON.parse(hostsStorage) as ApprovedHosts;
      // Check if the approved hosts haven't timed out.
      const approvedHosts: ApprovedHosts = {};
      let expiredCounter = 0;
      for (const host in uncheckedHosts) {
        const expirationTime = uncheckedHosts[host];
        if (Date.now() < expirationTime) {
          // Host is valid, add it to the list.
          approvedHosts[host] = expirationTime;
        } else {
          expiredCounter += 1;
        }
      }
      if (expiredCounter > 1) {
        // Update the list of approved hosts excluding the expired ones.
        await DefaultPreference.set(
          AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
          JSON.stringify(approvedHosts),
        );
      }
      instance.state.approvedHosts = approvedHosts;
      DevLogger.log(
        `SDKConnect::init() - approvedHosts [${
          Object.keys(instance.state.approvedHosts).length
        }]`,
      );
    }

    DevLogger.log(`SDKConnect::init() - done`);
    instance.state._initialized = true;
  } catch (err) {
    Logger.log(err, `SDKConnect::init() - error loading connections`);
  }
};

export default asyncInit;
