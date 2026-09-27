import settingsReducer from '.';
import { clearOnboarding } from '../../actions/onboarding';
import {
  dismissBasicFunctionalityMigrationNotification,
  setBasicFunctionality,
  setBasicFunctionalityConsolidatedEnabled,
  setBasicFunctionalityMigrationNotification,
  setHasLinkedSocialLoginProfile,
  setLockTime,
} from '../../actions/settings';

const getInitialState = () =>
  settingsReducer(undefined, { type: 'UNKNOWN_ACTION' });

// Reached through the real actions so the state carries exactly what a
// migrated wallet leaves behind.
const getMigratedState = () =>
  settingsReducer(
    settingsReducer(
      settingsReducer(
        getInitialState(),
        setBasicFunctionalityConsolidatedEnabled(true),
      ),
      setHasLinkedSocialLoginProfile(true),
    ),
    setBasicFunctionalityMigrationNotification('toast'),
  );

describe('settingsReducer', () => {
  describe('wallet deletion', () => {
    it('clears a pending migration notice and cohort membership', () => {
      const state = settingsReducer(getMigratedState(), clearOnboarding());

      // The next wallet restored on this install is a different wallet, so it
      // has to be judged on its own preferences rather than inherit this one's
      // cohort membership and notice.
      expect(state.isBasicFunctionalityConsolidatedEnabled).toBe(false);
      expect(state.hasLinkedSocialLoginProfile).toBe(false);
      expect(state.basicFunctionalityMigrationNotification).toBeNull();
    });

    it('clears a dismissed migration notice', () => {
      const dismissedState = settingsReducer(
        getMigratedState(),
        dismissBasicFunctionalityMigrationNotification(),
      );

      const state = settingsReducer(dismissedState, clearOnboarding());

      expect(state.basicFunctionalityMigrationNotificationDismissed).toBe(
        false,
      );
      expect(state.isBasicFunctionalityConsolidatedEnabled).toBe(false);
    });

    it('leaves the remaining settings untouched', () => {
      const existingState = settingsReducer(
        settingsReducer(getMigratedState(), setBasicFunctionality(false)),
        setLockTime(30000),
      );

      const state = settingsReducer(existingState, clearOnboarding());

      expect(state.basicFunctionalityEnabled).toBe(false);
      expect(state.lockTime).toBe(30000);
    });
  });
});
