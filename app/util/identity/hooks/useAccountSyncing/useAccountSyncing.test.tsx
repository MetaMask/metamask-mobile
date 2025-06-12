import { act } from '@testing-library/react-hooks';
import { renderHookWithProvider } from '../../../test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as actions from '../../../../actions/identity';
import {
  useAccountSyncing,
  useShouldDispatchAccountSyncing,
} from './useAccountSyncing';

interface ArrangeMocksMetamaskStateOverrides {
  isSignedIn: boolean;
  isBackupAndSyncEnabled: boolean;
  isAccountSyncingEnabled: boolean;
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
          keyrings: [],
        },
        AuthenticationController: {
          isSignedIn: stateOverrides.isSignedIn,
        },
        UserStorageController: {
          isBackupAndSyncEnabled: stateOverrides.isBackupAndSyncEnabled,
          isAccountSyncingEnabled: stateOverrides.isAccountSyncingEnabled,
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

describe('useShouldDispatchAccountSyncing()', () => {
  const testCases = (() => {
    const properties = [
      'isSignedIn',
      'isBackupAndSyncEnabled',
      'isAccountSyncingEnabled',
      'isUnlocked',
      'useExternalServices',
      'completedOnboarding',
      'isAccountSyncingReadyToBeDispatched',
    ] as const;
    const baseState = {
      isSignedIn: true,
      isBackupAndSyncEnabled: true,
      isAccountSyncingEnabled: true,
      isUnlocked: true,
      useExternalServices: true,
      completedOnboarding: true,
      isAccountSyncingReadyToBeDispatched: true,
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
      () => useShouldDispatchAccountSyncing(),
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
        () => useShouldDispatchAccountSyncing(),
        { state },
      );
      expect(hook.result.current).toBe(false);
    },
  );
});

describe('useAccountSyncing', () => {
  const arrangeMocks = () => {
    const mockSyncAccountsAction = jest.spyOn(
      actions,
      'syncInternalAccountsWithUserStorage',
    );
    return {
      mockSyncAccountsAction,
    };
  };

  const arrangeAndAct = (
    stateOverrides: ArrangeMocksMetamaskStateOverrides,
  ) => {
    const mocks = arrangeMocks();
    const { state } = arrangeMockState(stateOverrides);

    const { result } = renderHookWithProvider(() => useAccountSyncing(), {
      state,
    });
    const { dispatchAccountSyncing, shouldDispatchAccountSyncing } =
      result.current;

    return { mocks, dispatchAccountSyncing, shouldDispatchAccountSyncing };
  };

  it('should dispatch if conditions are met', async () => {
    const { mocks, dispatchAccountSyncing, shouldDispatchAccountSyncing } =
      arrangeAndAct({
        completedOnboarding: true,
        isAccountSyncingReadyToBeDispatched: true,
        isBackupAndSyncEnabled: true,
        isAccountSyncingEnabled: true,
        isSignedIn: true,
        isUnlocked: true,
        useExternalServices: true,
      });

    await act(async () => dispatchAccountSyncing());

    expect(mocks.mockSyncAccountsAction).toHaveBeenCalled();
    expect(shouldDispatchAccountSyncing).toBe(true);
  });

  it('should not dispatch conditions are not met', async () => {
    const { mocks, dispatchAccountSyncing, shouldDispatchAccountSyncing } =
      arrangeAndAct({
        completedOnboarding: true,
        isAccountSyncingReadyToBeDispatched: false,
        isBackupAndSyncEnabled: true,
        isAccountSyncingEnabled: true,
        isSignedIn: true,
        isUnlocked: true,
        useExternalServices: true,
      });

    await act(async () => dispatchAccountSyncing());

    expect(mocks.mockSyncAccountsAction).not.toHaveBeenCalled();
    expect(shouldDispatchAccountSyncing).toBe(false);
  });
});
