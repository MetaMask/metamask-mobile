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
}

const arrangeMockState = (
  stateOverrides: ArrangeMocksMetamaskStateOverrides,
) => ({
  engine: {
    backgroundState: {
      KeyringController: {
        isUnlocked: stateOverrides.isUnlocked,
        keyrings: [],
      },
      AuthenticationController: {
        isSignedIn: stateOverrides.isSignedIn,
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

prerequisiteCombinations.forEach((combinedState) => {
  if (
    combinedState.isUnlocked &&
    combinedState.useExternalServices &&
    combinedState.completedOnboarding &&
    !combinedState.isSignedIn
  ) {
    shouldAutoSignInTestCases.push(combinedState);
  } else {
    shouldNotAutoSignInTestCases.push(combinedState);
  }
});

describe('useAutoSignIn', () => {
  it('initializes correctly', () => {
    const { state } = arrangeMocks({
      isUnlocked: false,
      isSignedIn: false,
      completedOnboarding: false,
      useExternalServices: false,
    });
    const hook = renderHookWithProvider(() => useAutoSignIn(), {
      state,
    });

    expect(hook.result.current.autoSignIn).toBeDefined();
    expect(hook.result.current.shouldAutoSignIn).toBeDefined();
  });

  shouldNotAutoSignInTestCases.forEach((stateOverrides) => {
    it(`does not call performSignIn if conditions are not met`, async () => {
      const { state, mockPerformSignInAction } = arrangeMocks(stateOverrides);
      const hook = renderHookWithProvider(() => useAutoSignIn(), { state });

      await act(async () => {
        await hook.result.current.autoSignIn();
      });

      expect(mockPerformSignInAction).not.toHaveBeenCalled();
    });
  });

  shouldAutoSignInTestCases.forEach((stateOverrides) => {
    it(`calls performSignIn if conditions are met`, async () => {
      const { state, mockPerformSignInAction } = arrangeMocks(stateOverrides);
      const hook = renderHookWithProvider(() => useAutoSignIn(), { state });

      await act(async () => {
        await hook.result.current.autoSignIn();
      });

      expect(mockPerformSignInAction).toHaveBeenCalled();
    });
  });

  it('calls performSignIn if new keyrings are detected', async () => {
    const stateOverrides = {
      isUnlocked: true,
      useExternalServices: true,
      isSignedIn: true,
      completedOnboarding: true,
    };
    const { state, mockPerformSignInAction } = arrangeMocks(stateOverrides);
    const hook = renderHookWithProvider(() => useAutoSignIn(), { state });

    // Initial call should not trigger sign-in
    await act(async () => {
      await hook.result.current.autoSignIn();
    });

    expect(mockPerformSignInAction).not.toHaveBeenCalled();

    // Simulate new keyrings being detected
    act(() => {
      hook.result.current.setHasNewKeyrings(true);
    });

    await act(async () => {
      await hook.result.current.autoSignIn();
    });

    expect(mockPerformSignInAction).toHaveBeenCalled();
  });
});
