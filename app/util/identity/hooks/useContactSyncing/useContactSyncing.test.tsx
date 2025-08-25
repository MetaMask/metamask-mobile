import { act } from '@testing-library/react-hooks';
import { renderHookWithProvider } from '../../../test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as actions from '../../../../actions/identity';
import {
  useContactSyncing,
  useShouldDispatchContactSyncing,
} from './useContactSyncing';

interface ArrangeMocksMetamaskStateOverrides {
  isSignedIn: boolean;
  isBackupAndSyncEnabled: boolean;
  isContactSyncingEnabled: boolean;
  isUnlocked: boolean;
  useExternalServices: boolean;
  completedOnboarding: boolean;
}

const arrangeMockState = (
  stateOverrides: ArrangeMocksMetamaskStateOverrides,
) => {
  const state = {
    engine: {
      backgroundState: {
        KeyringController: {
          isUnlocked: stateOverrides.isUnlocked,
        },
        AuthenticationController: {
          isSignedIn: stateOverrides.isSignedIn,
        },
        UserStorageController: {
          isBackupAndSyncEnabled: stateOverrides.isBackupAndSyncEnabled,
          isContactSyncingEnabled: stateOverrides.isContactSyncingEnabled,
        },
      },
    },
    settings: {
      basicFunctionalityEnabled: stateOverrides.useExternalServices,
    },
    onboarding: {
      completedOnboarding: stateOverrides.completedOnboarding,
    },
  };

  return { state };
};

describe('useShouldDispatchContactSyncing()', () => {
  const testCases = (() => {
    const properties = [
      'isSignedIn',
      'isBackupAndSyncEnabled',
      'isContactSyncingEnabled',
      'isUnlocked',
      'useExternalServices',
      'completedOnboarding',
    ] as const;
    const baseState = {
      isSignedIn: true,
      isBackupAndSyncEnabled: true,
      isContactSyncingEnabled: true,
      isUnlocked: true,
      useExternalServices: true,
      completedOnboarding: true,
    };

    const failureStateCases: {
      state: ArrangeMocksMetamaskStateOverrides;
      failingField: string;
    }[] = [];

    // Generate test cases by toggling each property
    properties.forEach((property) => {
      const state = { ...baseState, [property]: false };
      failureStateCases.push({ state, failingField: property });
    });

    const successTestCase = { state: baseState };

    return { successTestCase, failureStateCases };
  })();

  it('returns true if all conditions are met', () => {
    const { state } = arrangeMockState(testCases.successTestCase.state);
    const hook = renderHookWithProvider(
      () => useShouldDispatchContactSyncing(),
      { state },
    );
    expect(hook.result.current).toBe(true);
  });

  it.each(testCases.failureStateCases)(
    'returns false if not all conditions are met [%s = false]',
    (testCase: {
      state: ArrangeMocksMetamaskStateOverrides;
      failingField: string;
    }) => {
      const { state } = arrangeMockState(testCase.state);
      const hook = renderHookWithProvider(
        () => useShouldDispatchContactSyncing(),
        { state },
      );
      expect(hook.result.current).toBe(false);
    },
  );
});

describe('useContactSyncing', () => {
  const arrangeMocks = () => {
    const mockSyncContactsAction = jest.spyOn(
      actions,
      'syncContactsWithUserStorage',
    );
    return {
      mockSyncContactsAction,
    };
  };

  const arrangeAndAct = (
    stateOverrides: ArrangeMocksMetamaskStateOverrides,
  ) => {
    const mocks = arrangeMocks();
    const { state } = arrangeMockState(stateOverrides);

    const { result } = renderHookWithProvider(() => useContactSyncing(), {
      state,
    });
    const { dispatchContactSyncing, shouldDispatchContactSyncing } =
      result.current;

    return { mocks, dispatchContactSyncing, shouldDispatchContactSyncing };
  };

  it('dispatches if conditions are met', async () => {
    const { mocks, dispatchContactSyncing, shouldDispatchContactSyncing } =
      arrangeAndAct({
        completedOnboarding: true,
        isBackupAndSyncEnabled: true,
        isContactSyncingEnabled: true,
        isSignedIn: true,
        isUnlocked: true,
        useExternalServices: true,
      });

    await act(async () => dispatchContactSyncing());

    expect(mocks.mockSyncContactsAction).toHaveBeenCalled();
    expect(shouldDispatchContactSyncing).toBe(true);
  });

  it('should not dispatch when conditions are not met', async () => {
    const { mocks, dispatchContactSyncing, shouldDispatchContactSyncing } =
      arrangeAndAct({
        completedOnboarding: true,
        isBackupAndSyncEnabled: true,
        isContactSyncingEnabled: false,
        isSignedIn: true,
        isUnlocked: true,
        useExternalServices: true,
      });

    await act(async () => dispatchContactSyncing());

    expect(mocks.mockSyncContactsAction).not.toHaveBeenCalled();
    expect(shouldDispatchContactSyncing).toBe(false);
  });
});
