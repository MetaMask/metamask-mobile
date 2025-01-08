import { useSelector } from 'react-redux';

interface PreferencesState {
  smartTransactionsOptInStatus?: boolean;
  smartTransactionsMigrationApplied?: boolean;
}

interface RootState {
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

  return {
    isEnabled,
    isMigrationApplied,
  };
};

export default useSmartTransactionsEnabled;
