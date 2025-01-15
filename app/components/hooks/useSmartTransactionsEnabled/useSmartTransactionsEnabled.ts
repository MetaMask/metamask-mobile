import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Logger from '../../../util/Logger';

interface PreferencesState {
  smartTransactionsOptInStatus?: boolean;
  smartTransactionsMigrationApplied?: boolean;
  smartTransactionsBannerDismissed?: boolean;
}

interface RootState {
  engine: {
    backgroundState: {
      PreferencesController: PreferencesState;
    };
  };
}

const SET_SMART_TRANSACTIONS_BANNER_DISMISSED = 'SET_SMART_TRANSACTIONS_BANNER_DISMISSED';

const useSmartTransactionsEnabled = () => {
  const dispatch = useDispatch();

  const preferencesState = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.PreferencesController
  );

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
      state.engine.backgroundState.PreferencesController
        .smartTransactionsBannerDismissed ?? false,
  );

  const dismissBanner = useCallback(() => {
    dispatch({
      type: SET_SMART_TRANSACTIONS_BANNER_DISMISSED,
      payload: true,
    });
  }, [dispatch]);

  const shouldShowBanner = isEnabled
    && isMigrationApplied
      && !isBannerDismissed;

  Logger.log('[STX Hook] State values:', {
    isEnabled,
    isMigrationApplied,
    isBannerDismissed,
    shouldShowBanner,
    rawState: preferencesState
  });

  return {
    isEnabled,
    isMigrationApplied,
    isBannerDismissed,
    shouldShowBanner,
    dismissBanner,
  };
};

export default useSmartTransactionsEnabled;
