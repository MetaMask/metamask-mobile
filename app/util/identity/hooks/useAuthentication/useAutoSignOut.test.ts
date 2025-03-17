import { act } from '@testing-library/react-hooks';
import { renderHookWithProvider } from '../../../test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as actions from '../../../../actions/identity';
import { useAutoSignOut } from './useAutoSignOut';

interface ArrangeMocksMetamaskStateOverrides {
  isUnlocked: boolean;
  useExternalServices: boolean;
  isSignedIn: boolean;
}

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
    },
  },
  settings: {
    basicFunctionalityEnabled: stateOverrides.useExternalServices,
  },
});

const arrangeMocks = (stateOverrides: ArrangeMocksMetamaskStateOverrides) => {
  jest.clearAllMocks();
  const state = arrangeMockState(stateOverrides);
  const mockPerformSignInAction = jest.spyOn(actions, 'performSignOut');
  return {
    state,
    mockPerformSignInAction,
  };
};

const prerequisitesStateKeys = [
  'isUnlocked',
  'useExternalServices',
  'isSignedIn',
];

const shouldAutoSignOutTestCases: ArrangeMocksMetamaskStateOverrides[] = [];
const shouldNotAutoSignOutTestCases: ArrangeMocksMetamaskStateOverrides[] = [];

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
    !combinedState.useExternalServices &&
    combinedState.isSignedIn
  ) {
    shouldAutoSignOutTestCases.push(combinedState);
  } else {
    shouldNotAutoSignOutTestCases.push(combinedState);
  }
});

describe('useAutoSignOut', () => {
  it('should initialize correctly', () => {
    const { state } = arrangeMocks({
      isUnlocked: false,
      isSignedIn: false,
      useExternalServices: false,
    });

    const hook = renderHookWithProvider(() => useAutoSignOut(), { state });

    expect(hook.result.current.autoSignOut).toBeDefined();
    expect(hook.result.current.shouldAutoSignOut).toBeDefined();
  });

  shouldNotAutoSignOutTestCases.forEach((stateOverrides) => {
    it(`should not call performSignOut if conditions are not met`, async () => {
      const { state, mockPerformSignInAction } = arrangeMocks(stateOverrides);
      const hook = renderHookWithProvider(() => useAutoSignOut(), { state });

      await act(async () => {
        hook.result.current.autoSignOut();
      });

      expect(mockPerformSignInAction).not.toHaveBeenCalled();
    });
  });

  shouldAutoSignOutTestCases.forEach((stateOverrides) => {
    it(`should call performSignOut if conditions are met`, async () => {
      const { state, mockPerformSignInAction } = arrangeMocks(stateOverrides);
      const hook = renderHookWithProvider(() => useAutoSignOut(), { state });

      await act(async () => {
        await hook.result.current.autoSignOut();
      });

      expect(mockPerformSignInAction).toHaveBeenCalled();
    });
  });
});
