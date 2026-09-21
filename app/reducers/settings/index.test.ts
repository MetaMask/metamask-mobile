import settingsReducer from '.';
import { clearOnboarding } from '../../actions/onboarding';

const getInitialState = () =>
  settingsReducer(undefined, { type: 'UNKNOWN_ACTION' });

describe('settingsReducer', () => {
  describe('wallet deletion', () => {
    it('clears Basic Functionality migration state', () => {
      const migratedState = {
        ...getInitialState(),
        isBasicFunctionalityConsolidatedEnabled: true,
        basicFunctionalityMigrationNotification: 'toast',
        basicFunctionalityMigrationNotificationDismissed: true,
      };

      const state = settingsReducer(migratedState, clearOnboarding());

      // The next wallet restored on this install is a different wallet, so it
      // has to be judged on its own preferences rather than inherit this one's
      // cohort membership and dismissed notice.
      expect(state.isBasicFunctionalityConsolidatedEnabled).toBe(false);
      expect(state.basicFunctionalityMigrationNotification).toBeNull();
      expect(state.basicFunctionalityMigrationNotificationDismissed).toBe(
        false,
      );
    });

    it('leaves the remaining settings untouched', () => {
      const existingState = {
        ...getInitialState(),
        basicFunctionalityEnabled: false,
        isBasicFunctionalityConsolidatedEnabled: true,
        lockTime: 30000,
        hideZeroBalanceTokens: false,
      };

      const state = settingsReducer(existingState, clearOnboarding());

      expect(state.basicFunctionalityEnabled).toBe(false);
      expect(state.lockTime).toBe(30000);
      expect(state.hideZeroBalanceTokens).toBe(false);
    });
  });
});
