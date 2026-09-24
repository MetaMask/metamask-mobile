import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';

import {
  toggleBasicFunctionality,
  consolidateBasicFunctionality,
  dismissBasicFunctionalityMigrationNotification,
  setBasicFunctionality,
  setBasicFunctionalityConsolidatedEnabled,
  setBasicFunctionalityMigrationNotification,
} from './index';
import {
  selectMobileUxBftcConsolidationFlagEnabled,
  selectIsInBasicFunctionalityConsolidationRollout,
  selectIsSocialLoginBasicFunctionalityLocked,
  selectShouldRepairSocialLoginBasicFunctionality,
} from '../../selectors/featureFlagController/basicFunctionalityConsolidation';
import { syncConsolidatedBasicFunctionalityPreferences } from '../../util/basicFunctionality/syncConsolidatedBasicFunctionalityPreferences';
import { MetaMetricsEvents } from '../../core/Analytics';

const mockSyncConsolidatedBasicFunctionalityPreferences = jest.mocked(
  syncConsolidatedBasicFunctionalityPreferences,
);
const mockSelectMobileUxBftcConsolidationFlagEnabled = jest.mocked(
  selectMobileUxBftcConsolidationFlagEnabled,
);
const mockSelectIsInBasicFunctionalityConsolidationRollout = jest.mocked(
  selectIsInBasicFunctionalityConsolidationRollout,
);
const mockSelectIsSocialLoginBasicFunctionalityLocked = jest.mocked(
  selectIsSocialLoginBasicFunctionalityLocked,
);
const mockSelectShouldRepairSocialLoginBasicFunctionality = jest.mocked(
  selectShouldRepairSocialLoginBasicFunctionality,
);
const mockGetBasicFunctionalityConsolidationPlan = jest.fn(() => ({
  landingState: true,
  notification: 'toast',
}));
const mockIsBasicFunctionalitySocialLoginUser = jest.fn(() => false);

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({ name: 'mock-event' });
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: (...args) => mockTrackEvent(...args),
  },
}));

jest.mock('../../util/analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: {
    createEventBuilder: (...args) => mockCreateEventBuilder(...args),
  },
}));

// Mock Engine
const mockSetBasicFunctionality = jest.fn().mockResolvedValue(undefined);
const mockSetIsBackupAndSyncFeatureEnabled = jest
  .fn()
  .mockResolvedValue(undefined);
jest.mock('../../core/Engine', () => ({
  default: {
    context: {
      MultichainAccountService: {
        setBasicFunctionality: mockSetBasicFunctionality,
      },
      UserStorageController: {
        setIsBackupAndSyncFeatureEnabled: mockSetIsBackupAndSyncFeatureEnabled,
      },
      PreferencesController: {},
    },
  },
}));

jest.mock(
  '../../selectors/featureFlagController/basicFunctionalityConsolidation',
  () => ({
    selectMobileUxBftcConsolidationFlagEnabled: jest.fn(() => false),
    selectIsInBasicFunctionalityConsolidationRollout: jest.fn(() => false),
    selectIsSocialLoginBasicFunctionalityLocked: jest.fn(() => false),
    selectShouldRepairSocialLoginBasicFunctionality: jest.fn(() => false),
    BFT_CHILD_PREFERENCES: [
      'useTransactionSimulations',
      'securityAlertsEnabled',
    ],
  }),
);

jest.mock(
  '../../util/basicFunctionality/syncConsolidatedBasicFunctionalityPreferences',
  () => ({
    syncConsolidatedBasicFunctionalityPreferences: jest.fn(),
  }),
);

jest.mock(
  '../../util/basicFunctionality/getBasicFunctionalityConsolidationPlan',
  () => ({
    getBasicFunctionalityConsolidationPlan: (...args) =>
      mockGetBasicFunctionalityConsolidationPlan(...args),
    isBasicFunctionalitySocialLoginUser: (...args) =>
      mockIsBasicFunctionalitySocialLoginUser(...args),
  }),
);

describe('toggleBasicFunctionality action', () => {
  let mockDispatch;
  let mockGetState;

  beforeEach(() => {
    mockDispatch = jest.fn();
    mockGetState = jest.fn(() => ({}));
    jest.clearAllMocks();
    mockSetBasicFunctionality.mockResolvedValue(undefined);
    mockSetIsBackupAndSyncFeatureEnabled.mockResolvedValue(undefined);
    mockSelectMobileUxBftcConsolidationFlagEnabled.mockReturnValue(false);
    mockSelectIsInBasicFunctionalityConsolidationRollout.mockReturnValue(false);
    mockSelectIsSocialLoginBasicFunctionalityLocked.mockReturnValue(false);
    mockSelectShouldRepairSocialLoginBasicFunctionality.mockReturnValue(false);
  });

  it('dispatches Redux state update and calls MultichainAccountService', async () => {
    const action = toggleBasicFunctionality(true);
    await action(mockDispatch, mockGetState);

    // Verify Redux state is updated
    expect(mockDispatch).toHaveBeenCalledWith(setBasicFunctionality(true));

    // Verify MultichainAccountService was called
    expect(mockSetBasicFunctionality).toHaveBeenCalledWith(true);
  });

  it('dispatches Redux state update with false value', async () => {
    const action = toggleBasicFunctionality(false);
    await action(mockDispatch, mockGetState);

    // Verify Redux state is updated
    expect(mockDispatch).toHaveBeenCalledWith(setBasicFunctionality(false));

    // Verify MultichainAccountService was called with false
    expect(mockSetBasicFunctionality).toHaveBeenCalledWith(false);
  });

  it('ignores attempts to disable Basic Functionality for a locked social-login wallet', async () => {
    mockSelectIsSocialLoginBasicFunctionalityLocked.mockReturnValue(true);
    const action = toggleBasicFunctionality(false);

    await action(mockDispatch, mockGetState);

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(
      mockSyncConsolidatedBasicFunctionalityPreferences,
    ).not.toHaveBeenCalled();
    expect(mockSetBasicFunctionality).not.toHaveBeenCalled();
  });

  it('disables Backup & Sync before turning Basic Functionality off', async () => {
    mockGetState.mockReturnValue({
      engine: {
        backgroundState: {
          UserStorageController: {
            isBackupAndSyncEnabled: true,
          },
        },
      },
    });
    mockDispatch.mockImplementation(() => {
      expect(mockSetIsBackupAndSyncFeatureEnabled).toHaveBeenCalledWith(
        BACKUPANDSYNC_FEATURES.main,
        false,
      );
    });
    const action = toggleBasicFunctionality(false);

    await action(mockDispatch, mockGetState);

    expect(mockDispatch).toHaveBeenCalledWith(setBasicFunctionality(false));
  });

  it('still turns Basic Functionality off when Backup & Sync cannot be disabled', async () => {
    const controllerError = new Error('User storage unavailable');
    mockSetIsBackupAndSyncFeatureEnabled.mockRejectedValue(controllerError);
    mockGetState.mockReturnValue({
      engine: {
        backgroundState: {
          UserStorageController: {
            isBackupAndSyncEnabled: true,
          },
        },
      },
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const action = toggleBasicFunctionality(false);

    await action(mockDispatch, mockGetState);

    expect(mockDispatch).toHaveBeenCalledWith(setBasicFunctionality(false));
    expect(mockSetBasicFunctionality).toHaveBeenCalledWith(false);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('handles MultichainAccountService errors gracefully', async () => {
    // Mock MultichainAccountService to throw an error
    const mockError = new Error('Service error');
    mockSetBasicFunctionality.mockRejectedValue(mockError);

    // Spy on console.error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const action = toggleBasicFunctionality(false);
    await action(mockDispatch, mockGetState);

    // Verify Redux state is still updated despite service error
    expect(mockDispatch).toHaveBeenCalledWith(setBasicFunctionality(false));

    // Verify MultichainAccountService was called
    expect(mockSetBasicFunctionality).toHaveBeenCalledWith(false);

    // Wait for the promise rejection to be caught
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify error was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to set basic functionality on MultichainAccountService:',
      mockError,
    );

    consoleSpy.mockRestore();
  });

  it('syncs consolidated preferences when the rollout is enabled', async () => {
    mockSelectIsInBasicFunctionalityConsolidationRollout.mockReturnValue(true);
    const action = toggleBasicFunctionality(false);
    await action(mockDispatch, mockGetState);

    expect(mockGetState).toHaveBeenCalled();
    expect(
      mockSelectIsInBasicFunctionalityConsolidationRollout,
    ).toHaveBeenCalledWith({});
    expect(mockDispatch).toHaveBeenCalledWith(
      setBasicFunctionalityConsolidatedEnabled(true),
    );
    expect(
      mockSyncConsolidatedBasicFunctionalityPreferences,
    ).toHaveBeenCalledWith(false);
  });

  it('evaluates the rollout before flipping BF so mixed users still sync', async () => {
    const callOrder = [];
    mockSelectIsInBasicFunctionalityConsolidationRollout.mockImplementation(
      () => {
        callOrder.push('select');
        return true;
      },
    );
    mockDispatch.mockImplementation((action) => {
      callOrder.push(action.type);
      return action;
    });

    const action = toggleBasicFunctionality(false);
    await action(mockDispatch, mockGetState);

    expect(callOrder[0]).toBe('select');
    expect(callOrder).toEqual([
      'select',
      'SET_BASIC_FUNCTIONALITY_CONSOLIDATED_ENABLED',
      'TOGGLE_BASIC_FUNCTIONALITY',
    ]);
    expect(
      mockSyncConsolidatedBasicFunctionalityPreferences,
    ).toHaveBeenCalledWith(false);
  });

  it('does not sync consolidated preferences when consolidation is disabled', async () => {
    const action = toggleBasicFunctionality(true);
    await action(mockDispatch, mockGetState);

    expect(
      mockSyncConsolidatedBasicFunctionalityPreferences,
    ).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setBasicFunctionalityConsolidatedEnabled(true),
    );
  });

  it('keeps syncing children for an enrolled wallet once the enrollment flag reads false', async () => {
    mockSelectMobileUxBftcConsolidationFlagEnabled.mockReturnValue(false);
    mockSelectIsInBasicFunctionalityConsolidationRollout.mockReturnValue(true);

    const action = toggleBasicFunctionality(false);
    await action(mockDispatch, mockGetState);

    expect(
      mockSyncConsolidatedBasicFunctionalityPreferences,
    ).toHaveBeenCalledWith(false);
  });
});

describe('consolidateBasicFunctionality action', () => {
  const state = {
    settings: {
      basicFunctionalityEnabled: false,
      isBasicFunctionalityConsolidatedEnabled: false,
      basicFunctionalityMigrationNotificationDismissed: false,
    },
    onboarding: {
      accountType: 'metamask',
    },
    engine: {
      backgroundState: {
        PreferencesController: {
          useTransactionSimulations: true,
          securityAlertsEnabled: false,
        },
        SeedlessOnboardingController: {},
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddProperties.mockReturnThis();
    mockBuild.mockReturnValue({ name: 'mock-event' });
    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: mockAddProperties,
      build: mockBuild,
    }));
    mockSetBasicFunctionality.mockResolvedValue(undefined);
    mockSelectMobileUxBftcConsolidationFlagEnabled.mockReturnValue(true);
    mockGetBasicFunctionalityConsolidationPlan.mockReturnValue({
      landingState: true,
      notification: 'toast',
    });
    mockIsBasicFunctionalitySocialLoginUser.mockReturnValue(false);
  });

  it('aligns preferences and schedules the one-time notification', async () => {
    const dispatch = jest.fn();

    await consolidateBasicFunctionality()(dispatch, () => state);

    expect(mockGetBasicFunctionalityConsolidationPlan).toHaveBeenCalledWith(
      {
        basicFunctionalityEnabled: false,
        useTransactionSimulations: true,
        securityAlertsEnabled: false,
      },
      false,
    );
    expect(
      mockSyncConsolidatedBasicFunctionalityPreferences,
    ).toHaveBeenCalledWith(true);
    expect(dispatch.mock.calls[0][0]).toEqual(
      setBasicFunctionalityConsolidatedEnabled(true),
    );
    expect(dispatch).toHaveBeenCalledWith(setBasicFunctionality(true));
    expect(dispatch).toHaveBeenCalledWith(
      setBasicFunctionalityMigrationNotification('toast'),
    );
  });

  it('migrates the wallet when the service rejects', async () => {
    const dispatch = jest.fn();
    const serviceError = new Error('Service error');
    mockSetBasicFunctionality.mockRejectedValue(serviceError);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await consolidateBasicFunctionality()(dispatch, () => state);

    // Wallet alignment is best effort: losing it must not cost the user the
    // migration or its notice, which the hook only attempts once per session.
    expect(
      mockSyncConsolidatedBasicFunctionalityPreferences,
    ).toHaveBeenCalledWith(true);
    expect(dispatch).toHaveBeenCalledWith(
      setBasicFunctionalityMigrationNotification('toast'),
    );
  });

  it('schedules the notification without waiting for wallet alignment', async () => {
    const dispatch = jest.fn();
    let finishAlignment;
    mockSetBasicFunctionality.mockReturnValue(
      new Promise((resolve) => {
        finishAlignment = resolve;
      }),
    );

    await consolidateBasicFunctionality()(dispatch, () => state);

    expect(dispatch).toHaveBeenCalledWith(
      setBasicFunctionalityMigrationNotification('toast'),
    );

    finishAlignment();
  });

  it('does not migrate when the remote flag is off', async () => {
    const dispatch = jest.fn();
    mockSelectMobileUxBftcConsolidationFlagEnabled.mockReturnValue(false);

    await consolidateBasicFunctionality()(dispatch, () => state);

    expect(dispatch).not.toHaveBeenCalled();
    expect(
      mockSyncConsolidatedBasicFunctionalityPreferences,
    ).not.toHaveBeenCalled();
  });

  it('does not reschedule a notification after dismissal', async () => {
    const dispatch = jest.fn();

    await consolidateBasicFunctionality()(dispatch, () => ({
      ...state,
      settings: {
        ...state.settings,
        basicFunctionalityMigrationNotificationDismissed: true,
      },
    }));

    expect(dispatch).toHaveBeenCalledWith(
      setBasicFunctionalityMigrationNotification(null),
    );
  });

  it('tracks Basic Functionality Migrated for unaligned wallets', async () => {
    const dispatch = jest.fn();

    await consolidateBasicFunctionality()(dispatch, () => state);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.BASIC_FUNCTIONALITY_MIGRATED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      routed_bf_state: 'on',
      is_social_login: false,
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-event' });
  });

  it('skips Basic Functionality Migrated for aligned wallets', async () => {
    const dispatch = jest.fn();
    mockGetBasicFunctionalityConsolidationPlan.mockReturnValue({
      landingState: true,
      notification: null,
    });

    await consolidateBasicFunctionality()(dispatch, () => ({
      ...state,
      settings: {
        ...state.settings,
        basicFunctionalityEnabled: true,
      },
      engine: {
        backgroundState: {
          PreferencesController: {
            useTransactionSimulations: true,
            securityAlertsEnabled: true,
          },
          SeedlessOnboardingController: {},
        },
      },
    }));

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('tracks social login on the migrated event for unaligned social wallets', async () => {
    const dispatch = jest.fn();
    mockIsBasicFunctionalitySocialLoginUser.mockReturnValue(true);

    await consolidateBasicFunctionality()(dispatch, () => state);

    expect(mockAddProperties).toHaveBeenCalledWith({
      routed_bf_state: 'on',
      is_social_login: true,
    });
  });

  it('does not migrate a consolidated wallet that is already on', async () => {
    const dispatch = jest.fn();

    await consolidateBasicFunctionality()(dispatch, () => ({
      ...state,
      settings: {
        ...state.settings,
        basicFunctionalityEnabled: true,
        isBasicFunctionalityConsolidatedEnabled: true,
      },
    }));

    expect(dispatch).not.toHaveBeenCalled();
    expect(
      mockSyncConsolidatedBasicFunctionalityPreferences,
    ).not.toHaveBeenCalled();
  });

  it('schedules a missing notice for a consolidated linked-social wallet', async () => {
    const dispatch = jest.fn();
    mockSelectMobileUxBftcConsolidationFlagEnabled.mockReturnValue(false);
    mockSelectShouldRepairSocialLoginBasicFunctionality.mockReturnValue(true);
    mockIsBasicFunctionalitySocialLoginUser.mockReturnValue(true);

    await consolidateBasicFunctionality()(dispatch, () => ({
      ...state,
      settings: {
        ...state.settings,
        basicFunctionalityEnabled: true,
        isBasicFunctionalityConsolidatedEnabled: true,
        hasLinkedSocialLoginProfile: true,
      },
    }));

    expect(dispatch).toHaveBeenCalledWith(
      setBasicFunctionalityMigrationNotification('bottom-sheet'),
    );
    expect(
      mockSyncConsolidatedBasicFunctionalityPreferences,
    ).not.toHaveBeenCalled();
    expect(mockSetBasicFunctionality).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('turns Basic Functionality back on for a consolidated social-login wallet', async () => {
    const dispatch = jest.fn();
    mockSelectMobileUxBftcConsolidationFlagEnabled.mockReturnValue(false);
    mockSelectShouldRepairSocialLoginBasicFunctionality.mockReturnValue(true);
    mockIsBasicFunctionalitySocialLoginUser.mockReturnValue(true);
    mockGetBasicFunctionalityConsolidationPlan.mockReturnValue({
      landingState: true,
      notification: 'bottom-sheet',
    });

    await consolidateBasicFunctionality()(dispatch, () => ({
      ...state,
      settings: {
        ...state.settings,
        isBasicFunctionalityConsolidatedEnabled: true,
      },
    }));

    expect(mockSetBasicFunctionality).toHaveBeenCalledWith(true);
    expect(
      mockSyncConsolidatedBasicFunctionalityPreferences,
    ).toHaveBeenCalledWith(true);
    expect(dispatch).toHaveBeenCalledWith(setBasicFunctionality(true));
  });

  it('repairs the wallet when the repair service call rejects', async () => {
    // Turning the wallet back on is the point of the repair, and it is the
    // state the lock and the Settings switch read. Wallet alignment is best
    // effort here just as it is for a user-initiated toggle.
    const dispatch = jest.fn();
    mockSelectMobileUxBftcConsolidationFlagEnabled.mockReturnValue(false);
    mockSelectShouldRepairSocialLoginBasicFunctionality.mockReturnValue(true);
    mockIsBasicFunctionalitySocialLoginUser.mockReturnValue(true);
    mockGetBasicFunctionalityConsolidationPlan.mockReturnValue({
      landingState: true,
      notification: 'bottom-sheet',
    });
    mockSetBasicFunctionality.mockRejectedValue(new Error('service failed'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await consolidateBasicFunctionality()(dispatch, () => ({
      ...state,
      settings: {
        ...state.settings,
        isBasicFunctionalityConsolidatedEnabled: true,
      },
    }));

    expect(dispatch).toHaveBeenCalledWith(setBasicFunctionality(true));
    expect(
      mockSyncConsolidatedBasicFunctionalityPreferences,
    ).toHaveBeenCalledWith(true);
  });

  it('does not re-track the migrated event on a social repair', async () => {
    const dispatch = jest.fn();
    mockIsBasicFunctionalitySocialLoginUser.mockReturnValue(true);

    await consolidateBasicFunctionality()(dispatch, () => ({
      ...state,
      settings: {
        ...state.settings,
        isBasicFunctionalityConsolidatedEnabled: true,
      },
    }));

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('leaves a consolidated SRP wallet off', async () => {
    const dispatch = jest.fn();

    await consolidateBasicFunctionality()(dispatch, () => ({
      ...state,
      settings: {
        ...state.settings,
        isBasicFunctionalityConsolidatedEnabled: true,
      },
    }));

    expect(dispatch).not.toHaveBeenCalled();
    expect(mockSetBasicFunctionality).not.toHaveBeenCalled();
  });

  it('creates the persisted dismissal action', () => {
    expect(dismissBasicFunctionalityMigrationNotification()).toStrictEqual({
      type: 'DISMISS_BASIC_FUNCTIONALITY_MIGRATION_NOTIFICATION',
    });
  });
});
