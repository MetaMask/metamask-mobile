import { act } from '@testing-library/react-hooks';
import { renderHookWithProvider } from '../../../test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as actions from '../../../../actions/identity';
import { useAutoSignIn } from './useAutoSignIn';

interface ArrangeMocksMetamaskStateOverrides {
  isUnlocked: boolean;
  useExternalServices: boolean;
  isSignedIn: boolean;
  completedOnboarding: boolean;
  isProfileSyncingEnabled: boolean;
  participateInMetaMetrics: boolean;
  isNotificationServicesEnabled: boolean;
}

const mockMetricsIsEnabled = jest.fn();

jest.mock('../../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    isEnabled: mockMetricsIsEnabled,
  }),
}));

const arrangeMockState = (
  stateOverrides: ArrangeMocksMetamaskStateOverrides,
) => ({
  engine: {
    backgroundState: {
      KeyringController: {
        isUnlocked: stateOverrides.isUnlocked,
      },
      AuthenticationController: {
        isSignedIn: stateOverrides.isSignedIn,
      },
      UserStorageController: {
        isProfileSyncingEnabled: stateOverrides.isProfileSyncingEnabled,
      },
      NotificationServicesController: {
        isNotificationServicesEnabled:
          stateOverrides.isNotificationServicesEnabled,
      },
    },
  },
  onboarding: {
    completedOnboarding: stateOverrides.completedOnboarding,
  },
  settings: {
    basicFunctionalityEnabled: stateOverrides.useExternalServices,
  },
});

const arrangeMocks = (stateOverrides: ArrangeMocksMetamaskStateOverrides) => {
  jest.clearAllMocks();
  const state = arrangeMockState(stateOverrides);

  mockMetricsIsEnabled.mockReturnValue(stateOverrides.participateInMetaMetrics);

  const mockPerformSignInAction = jest.spyOn(actions, 'performSignIn');
  return {
    state,
    mockPerformSignInAction,
  };
};

const prerequisitesStateKeys = [
  'isUnlocked',
  'useExternalServices',
  'isSignedIn',
  'completedOnboarding',
];

const authDependentFeaturesStateKeys = [
  'isProfileSyncingEnabled',
  'participateInMetaMetrics',
  'isNotificationServicesEnabled',
];

const shouldAutoSignInTestCases: ArrangeMocksMetamaskStateOverrides[] = [];
const shouldNotAutoSignInTestCases: ArrangeMocksMetamaskStateOverrides[] = [];

// We generate all possible combinations of the prerequisites and auth-dependent features here
const generateCombinations = (keys: string[]) => {
  const result: ArrangeMocksMetamaskStateOverrides[] = [];
  const total = 2 ** keys.length;
  for (let i = 0; i < total; i++) {
    const state = {} as ArrangeMocksMetamaskStateOverrides;
    keys.forEach((key, index) => {
      state[key as keyof ArrangeMocksMetamaskStateOverrides] = Boolean(
        Math.floor(i / 2 ** index) % 2,
      );
    });
    result.push(state);
  }
  return result;
};

const prerequisiteCombinations = generateCombinations(prerequisitesStateKeys);
const authDependentCombinations = generateCombinations(
  authDependentFeaturesStateKeys,
);

prerequisiteCombinations.forEach((prerequisiteState) => {
  authDependentCombinations.forEach((authDependentState) => {
    const combinedState = {
      ...prerequisiteState,
      ...authDependentState,
    };
    if (
      combinedState.isUnlocked &&
      combinedState.useExternalServices &&
      combinedState.completedOnboarding &&
      !combinedState.isSignedIn &&
      authDependentFeaturesStateKeys.some(
        (key) => combinedState[key as keyof ArrangeMocksMetamaskStateOverrides],
      )
    ) {
      shouldAutoSignInTestCases.push(combinedState);
    } else {
      shouldNotAutoSignInTestCases.push(combinedState);
    }
  });
});

describe('useAutoSignIn', () => {
  it('should initialize correctly', () => {
    const { state } = arrangeMocks({
      isUnlocked: false,
      isProfileSyncingEnabled: false,
      isSignedIn: false,
      completedOnboarding: false,
      participateInMetaMetrics: false,
      useExternalServices: false,
      isNotificationServicesEnabled: false,
    });
    const hook = renderHookWithProvider(() => useAutoSignIn(), {
      state,
    });

    expect(hook.result.current.autoSignIn).toBeDefined();
    expect(hook.result.current.shouldAutoSignIn).toBeDefined();
  });

  shouldNotAutoSignInTestCases.forEach((stateOverrides) => {
    it(`should not call performSignIn if conditions are not met`, async () => {
      const { state, mockPerformSignInAction } = arrangeMocks(stateOverrides);
      const hook = renderHookWithProvider(() => useAutoSignIn(), { state });

      await act(async () => {
        await hook.result.current.autoSignIn();
      });

      expect(mockPerformSignInAction).not.toHaveBeenCalled();
    });
  });

  shouldAutoSignInTestCases.forEach((stateOverrides) => {
    it(`should call performSignIn if conditions are met`, async () => {
      const { state, mockPerformSignInAction } = arrangeMocks(stateOverrides);
      const hook = renderHookWithProvider(() => useAutoSignIn(), { state });

      await act(async () => {
        await hook.result.current.autoSignIn();
      });

      expect(mockPerformSignInAction).toHaveBeenCalled();
    });
  });
});
