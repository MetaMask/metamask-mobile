import { act } from '@testing-library/react-hooks';
import { renderHookWithProvider } from '../../../test/renderWithProvider';
import {
  useAccountSyncing,
  useShouldDispatchAccountSyncing,
} from './useAccountSyncing';

const mockSyncWithUserStorage = jest.fn<Promise<unknown>, []>();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AccountTreeController: {
        syncWithUserStorage: jest.fn(() => mockSyncWithUserStorage()),
      },
    },
  },
}));

interface ArrangeMocksMetamaskStateOverrides {
  isSignedIn: boolean;
  isBackupAndSyncEnabled: boolean;
  isAccountSyncingEnabled: boolean;
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
          keyrings: [],
        },
        AuthenticationController: {
          isSignedIn: stateOverrides.isSignedIn,
        },
        UserStorageController: {
          isBackupAndSyncEnabled: stateOverrides.isBackupAndSyncEnabled,
          isAccountSyncingEnabled: stateOverrides.isAccountSyncingEnabled,
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
    ] as const;
    const baseState = {
      isSignedIn: true,
      isBackupAndSyncEnabled: true,
      isAccountSyncingEnabled: true,
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
  const arrangeAndAct = (
    stateOverrides: ArrangeMocksMetamaskStateOverrides,
  ) => {
    jest.clearAllMocks();
    const { state } = arrangeMockState(stateOverrides);

    const { result } = renderHookWithProvider(() => useAccountSyncing(), {
      state,
    });
    const { dispatchAccountSyncing, shouldDispatchAccountSyncing } =
      result.current;

    return { dispatchAccountSyncing, shouldDispatchAccountSyncing };
  };

  it('should dispatch if conditions are met', async () => {
    const { dispatchAccountSyncing, shouldDispatchAccountSyncing } =
      arrangeAndAct({
        completedOnboarding: true,
        isBackupAndSyncEnabled: true,
        isAccountSyncingEnabled: true,
        isSignedIn: true,
        isUnlocked: true,
        useExternalServices: true,
      });

    await act(async () => dispatchAccountSyncing());

    expect(mockSyncWithUserStorage).toHaveBeenCalled();
    expect(shouldDispatchAccountSyncing).toBe(true);
  });

  it('should not dispatch conditions are not met', async () => {
    const { dispatchAccountSyncing, shouldDispatchAccountSyncing } =
      arrangeAndAct({
        completedOnboarding: true,
        isBackupAndSyncEnabled: true,
        isAccountSyncingEnabled: false,
        isSignedIn: true,
        isUnlocked: true,
        useExternalServices: true,
      });

    await act(async () => dispatchAccountSyncing());

    expect(mockSyncWithUserStorage).not.toHaveBeenCalled();
    expect(shouldDispatchAccountSyncing).toBe(false);
  });
});
