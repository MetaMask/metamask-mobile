import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { getVersion } from 'react-native-device-info';
import { Duration } from '@metamask/utils';

import { Authentication } from '../../../../core';
import { Performance } from '../../../../core/Performance';
import { queueColdHomepageReadyTrace } from '../../../../core/Performance/HomepageReady';
import {
  CURRENT_APP_VERSION,
  LAST_APP_VERSION,
} from '../../../../constants/storage';
import useInterval from '../../../hooks/useInterval';
import { useOTAUpdates } from '../../../hooks/useOTAUpdates';
import { selectExistingUser } from '../../../../reducers/user/selectors';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { selectSeedlessOnboardingLoginFlow } from '../../../../selectors/seedlessOnboardingController';
import StorageWrapper from '../../../../store/storage-wrapper';
import Logger from '../../../../util/Logger';
import { endTrace, TraceName } from '../../../../util/trace';

/**
 * Startup effects that used to run on `App`. Mounted as the last sibling of
 * `AppFlow` so these effects still run after the route tree's effects.
 */
const AppShellEffects = () => {
  const isSeedlessOnboardingLoginFlow = useSelector(
    selectSeedlessOnboardingLoginFlow,
  );

  useOTAUpdates();

  useEffect(() => {
    // End trace when first render is complete
    endTrace({ name: TraceName.UIStartup });
  }, []);

  const firstLoad = useRef(true);
  // periodically check seedless password outdated when app UI is open
  useInterval(
    async () => {
      if (isSeedlessOnboardingLoginFlow) {
        await Authentication.checkIsSeedlessPasswordOutdated({
          skipCache: firstLoad.current,
          captureSentryError: false,
        }).catch((error) => {
          Logger.error(error, 'App: Error in checkIsSeedlessPasswordOutdated');
        });
        firstLoad.current = false;
      }
    },
    {
      delay: Duration.Minute * 10,
      immediate: true,
    },
  );
  const existingUser = useSelector(selectExistingUser);
  const isUnlocked = useSelector(selectIsUnlocked);
  const hasQueuedColdHomepageReadyTrace = useRef(false);

  useEffect(() => {
    if (
      hasQueuedColdHomepageReadyTrace.current ||
      !existingUser ||
      !isUnlocked
    ) {
      return;
    }

    hasQueuedColdHomepageReadyTrace.current = true;
    queueColdHomepageReadyTrace(Performance.appLaunchTime);
  }, [existingUser, isUnlocked]);

  useEffect(() => {
    async function startApp() {
      try {
        const currentVersion = getVersion();
        const savedVersion = await StorageWrapper.getItem(CURRENT_APP_VERSION);

        if (currentVersion !== savedVersion) {
          if (savedVersion)
            await StorageWrapper.setItem(LAST_APP_VERSION, savedVersion);
          await StorageWrapper.setItem(CURRENT_APP_VERSION, currentVersion);
        }
        const lastVersion = await StorageWrapper.getItem(LAST_APP_VERSION);
        if (!lastVersion) {
          if (existingUser) {
            // Setting last version to first version if user exists and lastVersion does not, to simulate update
            await StorageWrapper.setItem(LAST_APP_VERSION, '0.0.1');
          } else {
            // Setting last version to current version so that it's not treated as an update
            await StorageWrapper.setItem(LAST_APP_VERSION, currentVersion);
          }
        }
      } catch (error) {
        Logger.error(error as Error);
      }
    }

    startApp().catch((error) => {
      Logger.error(error, 'Error starting app');
    });
    // This effect reads existingUser once at startup. Re-running it when
    // existingUser changes stores the wrong last version. The exhaustive-deps
    // override in .eslintrc.js keeps this dependency list.
  }, []);

  return null;
};

export default AppShellEffects;
