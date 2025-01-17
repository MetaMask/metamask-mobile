import { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';

// non-optional types
interface PreferencesState {
  smartTransactionsOptInStatus: boolean;
  smartTransactionsMigrationApplied: boolean;
  featureFlags: {
    smartTransactionsBannerDismissed: boolean;
    [key: string]: boolean | undefined;
  };
}

export interface RootState {
  engine: {
    backgroundState: {
      PreferencesController: PreferencesState;
    };
  };
}

const useSmartTransactionsEnabled = () => {
  const isEnabled = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.PreferencesController
        .smartTransactionsOptInStatus ?? false,
  );

  const isMigrationApplied = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.PreferencesController
        .smartTransactionsMigrationApplied ?? false,
  );

  const isBannerDismissed = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.PreferencesController.featureFlags?.smartTransactionsBannerDismissed
        ?? false,
  );

  const dismissBanner = useCallback(async () => {
    try {
      const { PreferencesController } = Engine.context;
      PreferencesController.setFeatureFlag('smartTransactionsBannerDismissed', true);
    } catch (error) {
      Logger.error(error as Error, 'Failed to dismiss banner:');
    }
  }, []);

  const shouldShowBanner = useMemo(
    () => isEnabled && isMigrationApplied && !isBannerDismissed,
    [isEnabled, isMigrationApplied, isBannerDismissed]
  );

  return {
    isEnabled,
    isMigrationApplied,
    isBannerDismissed,
    shouldShowBanner,
    dismissBanner,
  };
};

export default useSmartTransactionsEnabled;
