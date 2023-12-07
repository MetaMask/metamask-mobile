import { Platform } from 'react-native';
import DefaultPreference from 'react-native-default-preference';
import AppConstants from '../../../core/AppConstants';
import Logger from '../../../util/Logger';
import AndroidService from '../AndroidSDK/AndroidService';
import SDKConnect, { ApprovedHosts } from '../SDKConnect';
import DevLogger from '../utils/DevLogger';
import { wait } from '../utils/wait.util';
import { NavigationContainerRef } from '@react-navigation/native';

async function init({
  navigation,
  context,
  instance,
}: {
  navigation: NavigationContainerRef;
  context?: string;
  instance: SDKConnect;
}) {
  if (instance.state._initializing) {
    DevLogger.log(
      `SDKConnect::init()[${context}] -- already initializing -- wait for completion`,
    );
    return await instance.state._initializing;
  } else if (instance.state._initialized) {
    DevLogger.log(
      `SDKConnect::init()[${context}] -- SKIP -- already initialized`,
      instance.state.connections,
    );
    return;
  }

  if (!instance.state.androidSDKStarted && Platform.OS === 'android') {
    DevLogger.log(`SDKConnect::init() - starting android service`);
    instance.state.androidService = new AndroidService();
    instance.state.androidSDKStarted = true;
  }

  const doAsyncInit = async () => {
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

  instance.state._initializing = doAsyncInit();

  return instance.state._initializing;
}

export default init;
