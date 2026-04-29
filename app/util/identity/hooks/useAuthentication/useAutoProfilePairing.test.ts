import { act } from '@testing-library/react-hooks';
import { renderHookWithProvider } from '../../../test/renderWithProvider';
// eslint-disable-next-line import-x/no-namespace
import * as actions from '../../../../actions/identity';
import { useAutoProfilePairing } from './useAutoProfilePairing';

interface ArrangeMocksMetamaskStateOverrides {
  isUnlocked: boolean;
  useExternalServices: boolean;
  completedOnboarding: boolean;
  hasPairedAtLeastOnce: boolean;
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
        hasPairedAtLeastOnce: stateOverrides.hasPairedAtLeastOnce,
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

  const mockPerformProfilePairingAction = jest.spyOn(
    actions,
    'performProfilePairing',
  );
  return {
    state,
    mockPerformProfilePairingAction,
  };
};

const prerequisitesStateKeys = [
  'isUnlocked',
  'useExternalServices',
  'completedOnboarding',
  'hasPairedAtLeastOnce',
];

const shouldAutoPairTestCases: ArrangeMocksMetamaskStateOverrides[] = [];
const shouldNotAutoPairTestCases: ArrangeMocksMetamaskStateOverrides[] = [];

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

generateCombinations(prerequisitesStateKeys).forEach((combinedState) => {
  if (
    combinedState.isUnlocked &&
    combinedState.useExternalServices &&
    combinedState.completedOnboarding &&
    !combinedState.hasPairedAtLeastOnce
  ) {
    shouldAutoPairTestCases.push(combinedState);
  } else {
    shouldNotAutoPairTestCases.push(combinedState);
  }
});

describe('useAutoProfilePairing', () => {
  it('initializes correctly', () => {
    const { state } = arrangeMocks({
      isUnlocked: false,
      completedOnboarding: false,
      useExternalServices: false,
      hasPairedAtLeastOnce: false,
    });
    const hook = renderHookWithProvider(() => useAutoProfilePairing(), {
      state,
    });

    expect(hook.result.current.autoProfilePairing).toBeDefined();
    expect(hook.result.current.shouldAutoProfilePairing).toBeDefined();
  });

  shouldNotAutoPairTestCases.forEach((stateOverrides) => {
    it(`does not call performProfilePairing if conditions are not met`, async () => {
      const { state, mockPerformProfilePairingAction } =
        arrangeMocks(stateOverrides);
      const hook = renderHookWithProvider(() => useAutoProfilePairing(), {
        state,
      });

      await act(async () => {
        await hook.result.current.autoProfilePairing();
      });

      expect(mockPerformProfilePairingAction).not.toHaveBeenCalled();
    });
  });

  shouldAutoPairTestCases.forEach((stateOverrides) => {
    it(`calls performProfilePairing if conditions are met`, async () => {
      const { state, mockPerformProfilePairingAction } =
        arrangeMocks(stateOverrides);
      const hook = renderHookWithProvider(() => useAutoProfilePairing(), {
        state,
      });

      await act(async () => {
        await hook.result.current.autoProfilePairing();
      });

      expect(mockPerformProfilePairingAction).toHaveBeenCalled();
    });
  });

  it('calls performProfilePairing if new keyrings are detected', async () => {
    const stateOverrides = {
      isUnlocked: true,
      useExternalServices: true,
      completedOnboarding: true,
      hasPairedAtLeastOnce: true, // already paired, so only new keyrings should trigger
    };
    const { state, mockPerformProfilePairingAction } =
      arrangeMocks(stateOverrides);
    const hook = renderHookWithProvider(() => useAutoProfilePairing(), {
      state,
    });

    // Initial call should not trigger pairing (already paired, no new keyrings)
    await act(async () => {
      await hook.result.current.autoProfilePairing();
    });

    expect(mockPerformProfilePairingAction).not.toHaveBeenCalled();

    // Simulate a new keyring being added
    act(() => {
      hook.result.current.setHasNewKeyrings(true);
    });

    await act(async () => {
      await hook.result.current.autoProfilePairing();
    });

    expect(mockPerformProfilePairingAction).toHaveBeenCalled();
  });
});
