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
  isAccountSyncingEnabled: boolean;
  isContactSyncingEnabled: boolean;
  isUnlocked: boolean;
  useExternalServices: boolean;
  completedOnboarding: boolean;
  isAccountSyncingReadyToBeDispatched: boolean;
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
          isAccountSyncingEnabled: stateOverrides.isAccountSyncingEnabled,
          isContactSyncingEnabled: stateOverrides.isContactSyncingEnabled,
          isAccountSyncingReadyToBeDispatched:
            stateOverrides.isAccountSyncingReadyToBeDispatched,
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
      'isAccountSyncingEnabled',
      'isContactSyncingEnabled',
      'isUnlocked',
      'useExternalServices',
      'completedOnboarding',
      'isAccountSyncingReadyToBeDispatched',
    ] as const;
    const baseState = {
      isSignedIn: true,
      isBackupAndSyncEnabled: true,
      isAccountSyncingEnabled: false,
      isContactSyncingEnabled: true,
      isUnlocked: true,
      useExternalServices: true,
      completedOnboarding: true,
      isAccountSyncingReadyToBeDispatched: false,
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

  it('should return true if all conditions are met', () => {
    const { state } = arrangeMockState(testCases.successTestCase.state);
    const hook = renderHookWithProvider(
      () => useShouldDispatchContactSyncing(),
      { state },
    );
    expect(hook.result.current).toBe(true);
  });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  it.each(testCases.failureStateCases)(
    'should return false if not all conditions are met [%s = false]',
    ({
      state: failureState,
    }: (typeof testCases)['failureStateCases'][number]) => {
      const { state } = arrangeMockState(failureState);
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

  it('should dispatch if conditions are met', async () => {
    const { mocks, dispatchContactSyncing, shouldDispatchContactSyncing } =
      arrangeAndAct({
        completedOnboarding: true,
        isAccountSyncingReadyToBeDispatched: false,
        isBackupAndSyncEnabled: true,
        isAccountSyncingEnabled: false,
        isContactSyncingEnabled: true,
        isSignedIn: true,
        isUnlocked: true,
        useExternalServices: true,
      });

    await act(async () => dispatchContactSyncing());

    expect(mocks.mockSyncContactsAction).toHaveBeenCalled();
    expect(shouldDispatchContactSyncing).toBe(true);
  });

  it('should not dispatch conditions are not met', async () => {
    const { mocks, dispatchContactSyncing, shouldDispatchContactSyncing } =
      arrangeAndAct({
        completedOnboarding: true,
        isAccountSyncingReadyToBeDispatched: false,
        isBackupAndSyncEnabled: true,
        isAccountSyncingEnabled: false,
        isContactSyncingEnabled: true,
        isSignedIn: true,
        isUnlocked: true,
        useExternalServices: true,
      });

    await act(async () => dispatchContactSyncing());

    expect(mocks.mockSyncContactsAction).not.toHaveBeenCalled();
    expect(shouldDispatchContactSyncing).toBe(false);
  });
});
