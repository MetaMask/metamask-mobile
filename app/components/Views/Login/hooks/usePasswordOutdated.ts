import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { Authentication } from '../../../../core';
import Logger from '../../../../util/Logger';
import { selectIsSeedlessPasswordOutdated } from '../../../../selectors/seedlessOnboardingController';

export const usePasswordOutdated = (
  setError: (error: string | null) => void,
) => {
  const [refreshAuthPref, setRefreshAuthPref] = useState(false);
  const isSeedlessPasswordOutdated = useSelector(
    selectIsSeedlessPasswordOutdated,
  );

  useEffect(() => {
    if (isSeedlessPasswordOutdated) {
      setError(strings('login.seedless_password_outdated'));
      Authentication.resetPassword()
        .then(() => {
          setRefreshAuthPref(true);
        })
        .catch((e) => {
          Logger.error(e);
        });
    }
  }, [isSeedlessPasswordOutdated, setError]);

  return { refreshAuthPref, isSeedlessPasswordOutdated };
};
