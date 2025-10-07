import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Authentication } from '../../core';
import { selectSeedlessOnboardingLoginFlow } from '../../selectors/seedlessOnboardingController';
import Logger from '../../util/Logger';

export const useSyncSRPs = () => {
  const isSocialLoginEnabled = useSelector(selectSeedlessOnboardingLoginFlow);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Authentication.rehydrateLogs.push(
      'useSyncSRPs isSocialLoginEnabled: ' + isSocialLoginEnabled.toString(),
    );

    if (!isSocialLoginEnabled) {
      return;
    }

    (async () => {
      try {
        setLoading(true);
        await Authentication.syncSeedPhrases();
      } catch (error) {
        Authentication.rehydrateLogs.push(
          'useSyncSRPs error: ' + (error as Error).message,
        );
        Logger.error(error as Error, '[useSyncSRPs] error');
      } finally {
        setLoading(false);
      }
    })();
  }, [isSocialLoginEnabled]);

  return { loading };
};
