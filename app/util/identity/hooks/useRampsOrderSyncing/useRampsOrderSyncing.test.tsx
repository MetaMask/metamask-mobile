import { act } from '@testing-library/react-hooks';
import { renderHookWithProvider } from '../../../test/renderWithProvider';
import {
  useRampsOrderSyncing,
  useShouldDispatchRampsOrderSyncing,
} from './useRampsOrderSyncing';

const mockSyncOrdersWithUserStorage = jest.fn<Promise<unknown>, []>();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      RampsController: {
        syncOrdersWithUserStorage: jest.fn(() =>
          mockSyncOrdersWithUserStorage(),
        ),
      },
    },
  },
}));

interface ArrangeMocksMetamaskStateOverrides {
  isSignedIn: boolean;
  isBackupAndSyncEnabled: boolean;
  isRampsSyncingEnabled: boolean;
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
          isRampsSyncingEnabled: stateOverrides.isRampsSyncingEnabled,
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

describe('useShouldDispatchRampsOrderSyncing()', () => {
  const testCases = (() => {
    const properties = [
      'isSignedIn',
      'isBackupAndSyncEnabled',
      'isRampsSyncingEnabled',
      'isUnlocked',
      'useExternalServices',
      'completedOnboarding',
    ] as const;
    const baseState = {
      isSignedIn: true,
      isBackupAndSyncEnabled: true,
      isRampsSyncingEnabled: true,
      isUnlocked: true,
      useExternalServices: true,
      completedOnboarding: true,
    };

    const failureStateCases: {
      state: ArrangeMocksMetamaskStateOverrides;
      failingField: string;
    }[] = [];

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
      () => useShouldDispatchRampsOrderSyncing(),
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
        () => useShouldDispatchRampsOrderSyncing(),
        { state },
      );
      expect(hook.result.current).toBe(false);
    },
  );
});

describe('useRampsOrderSyncing', () => {
  const arrangeAndAct = (
    stateOverrides: ArrangeMocksMetamaskStateOverrides,
  ) => {
    jest.clearAllMocks();
    const { state } = arrangeMockState(stateOverrides);

    const { result } = renderHookWithProvider(() => useRampsOrderSyncing(), {
      state,
    });
    const { dispatchRampsOrderSyncing, shouldDispatchRampsOrderSyncing } =
      result.current;

    return { dispatchRampsOrderSyncing, shouldDispatchRampsOrderSyncing };
  };

  it('should dispatch if conditions are met', async () => {
    const { dispatchRampsOrderSyncing, shouldDispatchRampsOrderSyncing } =
      arrangeAndAct({
        completedOnboarding: true,
        isBackupAndSyncEnabled: true,
        isRampsSyncingEnabled: true,
        isSignedIn: true,
        isUnlocked: true,
        useExternalServices: true,
      });

    await act(async () => dispatchRampsOrderSyncing());

    expect(mockSyncOrdersWithUserStorage).toHaveBeenCalled();
    expect(shouldDispatchRampsOrderSyncing).toBe(true);
  });

  it('should not dispatch conditions are not met', async () => {
    const { dispatchRampsOrderSyncing, shouldDispatchRampsOrderSyncing } =
      arrangeAndAct({
        completedOnboarding: true,
        isBackupAndSyncEnabled: true,
        isRampsSyncingEnabled: false,
        isSignedIn: true,
        isUnlocked: true,
        useExternalServices: true,
      });

    await act(async () => dispatchRampsOrderSyncing());

    expect(mockSyncOrdersWithUserStorage).not.toHaveBeenCalled();
    expect(shouldDispatchRampsOrderSyncing).toBe(false);
  });
});
