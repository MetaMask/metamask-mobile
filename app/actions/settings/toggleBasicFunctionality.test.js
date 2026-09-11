import {
  toggleBasicFunctionality,
  consolidateBasicFunctionality,
  dismissBasicFunctionalityMigrationNotification,
  setBasicFunctionality,
  setBasicFunctionalityConsolidatedEnabled,
  setBasicFunctionalityMigrationNotification,
} from './index';
import { selectIsBasicFunctionalityConsolidationEnabled } from '../../selectors/featureFlagController/basicFunctionalityConsolidation';
import { syncConsolidatedBasicFunctionalityPreferences } from '../../util/basicFunctionality/syncConsolidatedBasicFunctionalityPreferences';

const mockSyncConsolidatedBasicFunctionalityPreferences = jest.mocked(
  syncConsolidatedBasicFunctionalityPreferences,
);
const mockSelectIsBasicFunctionalityConsolidationEnabled = jest.mocked(
  selectIsBasicFunctionalityConsolidationEnabled,
);
const mockSelectMobileUxBftcConsolidationFlagEnabled = jest.fn(() => true);
const mockGetBasicFunctionalityConsolidationPlan = jest.fn(() => ({
  landingState: true,
  notification: 'toast',
}));
const mockIsBasicFunctionalitySocialLoginUser = jest.fn(() => false);

// Mock Engine
const mockSetBasicFunctionality = jest.fn().mockResolvedValue(undefined);
jest.mock('../../core/Engine', () => ({
  default: {
    context: {
      MultichainAccountService: {
        setBasicFunctionality: mockSetBasicFunctionality,
      },
      PreferencesController: {},
    },
  },
}));

jest.mock(
  '../../selectors/featureFlagController/basicFunctionalityConsolidation',
  () => ({
    selectIsBasicFunctionalityConsolidationEnabled: jest.fn(() => false),
    selectMobileUxBftcConsolidationFlagEnabled: (...args) =>
      mockSelectMobileUxBftcConsolidationFlagEnabled(...args),
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
    mockSelectIsBasicFunctionalityConsolidationEnabled.mockReturnValue(false);
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

  it('syncs consolidated preferences when consolidation is enabled before toggle', async () => {
    mockSelectIsBasicFunctionalityConsolidationEnabled.mockReturnValue(true);
    const action = toggleBasicFunctionality(false);
    await action(mockDispatch, mockGetState);

    expect(mockGetState).toHaveBeenCalled();
    expect(
      mockSelectIsBasicFunctionalityConsolidationEnabled,
    ).toHaveBeenCalledWith({});
    expect(mockDispatch).toHaveBeenCalledWith(
      setBasicFunctionalityConsolidatedEnabled(true),
    );
    expect(
      mockSyncConsolidatedBasicFunctionalityPreferences,
    ).toHaveBeenCalledWith(false);
  });

  it('evaluates consolidation eligibility before flipping BF so silent users still sync', async () => {
    const callOrder = [];
    mockSelectIsBasicFunctionalityConsolidationEnabled.mockImplementation(
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
    mockSetBasicFunctionality.mockResolvedValue(undefined);
    mockSelectMobileUxBftcConsolidationFlagEnabled.mockReturnValue(true);
    mockGetBasicFunctionalityConsolidationPlan.mockReturnValue({
      landingState: true,
      notification: 'toast',
    });
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
    expect(dispatch).toHaveBeenCalledWith(setBasicFunctionality(true));
    expect(dispatch).toHaveBeenCalledWith(
      setBasicFunctionalityConsolidatedEnabled(true),
    );
    expect(dispatch).toHaveBeenCalledWith(
      setBasicFunctionalityMigrationNotification('toast'),
    );
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

  it('creates the persisted dismissal action', () => {
    expect(dismissBasicFunctionalityMigrationNotification()).toStrictEqual({
      type: 'DISMISS_BASIC_FUNCTIONALITY_MIGRATION_NOTIFICATION',
    });
  });
});
