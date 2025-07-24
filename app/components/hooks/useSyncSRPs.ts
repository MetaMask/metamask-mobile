import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Authentication } from '../../core';
import { selectSeedlessOnboardingLoginFlow } from '../../selectors/seedlessOnboardingController';
import Logger from '../../util/Logger';

export const useSyncSRPs = () => {
  const isSocialLoginEnabled = useSelector(selectSeedlessOnboardingLoginFlow);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSocialLoginEnabled) {
      return;
    }

    (async () => {
      try {
        setLoading(true);
        await Authentication.syncSeedPhrases();
      } catch (error) {
        Logger.error(error as Error, '[useSyncSRPs] error');
      } finally {
        setLoading(false);
      }
    })();
  }, [isSocialLoginEnabled]);

  return { loading };
};
