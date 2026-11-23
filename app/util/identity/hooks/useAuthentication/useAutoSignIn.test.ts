import { act } from '@testing-library/react-hooks';
import { renderHookWithProvider } from '../../../test/renderWithProvider';
// eslint-disable-next-line import-x/no-namespace
import * as actions from '../../../../actions/identity';
import { selectIsBasicFunctionalityConsolidationEnabled } from '../../../../selectors/featureFlagController/basicFunctionalityConsolidation';
import { useAutoSignIn } from './useAutoSignIn';

jest.mock(
  '../../../../selectors/featureFlagController/basicFunctionalityConsolidation',
  () => ({
    selectIsBasicFunctionalityConsolidationEnabled: jest.fn(() => false),
  }),
);

const mockedSelectIsBasicFunctionalityConsolidationEnabled = jest.mocked(
  selectIsBasicFunctionalityConsolidationEnabled,
);

interface ArrangeMocksMetamaskStateOverrides {
  isUnlocked: boolean;
  useExternalServices: boolean;
  isSignedIn: boolean;
  completedOnboarding: boolean;
  needsProfilePairing: boolean;
  needsSocialPairing?: boolean;
  hasSeedlessVault?: boolean;
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
        needsProfilePairing: stateOverrides.needsProfilePairing,
        needsSocialPairing: stateOverrides.needsSocialPairing,
      },
      SeedlessOnboardingController: {
        vault: stateOverrides.hasSeedlessVault ? 'vault' : undefined,
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
  const mockRequestProfilePairingAction = jest.spyOn(
    actions,
    'requestProfilePairing',
  );
  return {
    state,
    mockPerformSignInAction,
    mockRequestProfilePairingAction,
  };
};

const prerequisitesStateKeys = [
  'isUnlocked',
  'useExternalServices',
  'isSignedIn',
  'completedOnboarding',
  'needsProfilePairing',
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
  // Mirror the gate in the hook:
  //   (!isSignedIn || needsProfilePairing) &&
  //   isUnlocked && useExternalServices && completedOnboarding
  if (
    combinedState.isUnlocked &&
    combinedState.useExternalServices &&
    combinedState.completedOnboarding &&
    (!combinedState.isSignedIn || combinedState.needsProfilePairing)
  ) {
    shouldAutoSignInTestCases.push(combinedState);
  } else {
    shouldNotAutoSignInTestCases.push(combinedState);
  }
});

describe('useAutoSignIn', () => {
  beforeEach(() => {
    mockedSelectIsBasicFunctionalityConsolidationEnabled.mockReturnValue(false);
  });

  it('initializes correctly', () => {
    const { state } = arrangeMocks({
      isUnlocked: false,
      isSignedIn: false,
      completedOnboarding: false,
      useExternalServices: false,
      needsProfilePairing: false,
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

  it('forces sign-in when needsProfilePairing flips, even if already signed in', async () => {
    const { state, mockPerformSignInAction } = arrangeMocks({
      isUnlocked: true,
      useExternalServices: true,
      isSignedIn: true,
      completedOnboarding: true,
      needsProfilePairing: true,
    });
    const hook = renderHookWithProvider(() => useAutoSignIn(), { state });

    await act(async () => {
      await hook.result.current.autoSignIn();
    });

    // `signIn(true)` is called: the hook passes `true` to force a fresh
    // `performSignIn` so the controller re-runs pairing.
    expect(mockPerformSignInAction).toHaveBeenCalled();
  });

  it('calls performSignIn if new keyrings are detected', async () => {
    const stateOverrides = {
      isUnlocked: true,
      useExternalServices: true,
      isSignedIn: true,
      completedOnboarding: true,
      needsProfilePairing: false,
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

  describe('social identifier pairing', () => {
    const socialPairingReadyState = {
      isUnlocked: true,
      useExternalServices: true,
      isSignedIn: true,
      completedOnboarding: true,
      needsProfilePairing: false,
    };

    it('forces sign-in for a social-login user when pairing is needed and consolidation is on', async () => {
      mockedSelectIsBasicFunctionalityConsolidationEnabled.mockReturnValue(
        true,
      );
      const { state, mockPerformSignInAction } = arrangeMocks({
        ...socialPairingReadyState,
        needsSocialPairing: true,
        hasSeedlessVault: true,
      });
      const hook = renderHookWithProvider(() => useAutoSignIn(), { state });

      await act(async () => {
        await hook.result.current.autoSignIn();
      });

      expect(mockPerformSignInAction).toHaveBeenCalled();
    });

    it('does not force sign-in for an SRP user when pairing is needed and consolidation is on', async () => {
      mockedSelectIsBasicFunctionalityConsolidationEnabled.mockReturnValue(
        true,
      );
      const { state, mockPerformSignInAction } = arrangeMocks({
        ...socialPairingReadyState,
        needsSocialPairing: true,
        hasSeedlessVault: false,
      });
      const hook = renderHookWithProvider(() => useAutoSignIn(), { state });

      await act(async () => {
        await hook.result.current.autoSignIn();
      });

      expect(mockPerformSignInAction).not.toHaveBeenCalled();
    });

    it('does not force sign-in for a social-login user when consolidation is off', async () => {
      mockedSelectIsBasicFunctionalityConsolidationEnabled.mockReturnValue(
        false,
      );
      const { state, mockPerformSignInAction } = arrangeMocks({
        ...socialPairingReadyState,
        needsSocialPairing: true,
        hasSeedlessVault: true,
      });
      const hook = renderHookWithProvider(() => useAutoSignIn(), { state });

      await act(async () => {
        await hook.result.current.autoSignIn();
      });

      expect(mockPerformSignInAction).not.toHaveBeenCalled();
    });

    it('does not force sign-in for a social-login user when pairing is not needed', async () => {
      mockedSelectIsBasicFunctionalityConsolidationEnabled.mockReturnValue(
        true,
      );
      const { state, mockPerformSignInAction } = arrangeMocks({
        ...socialPairingReadyState,
        needsSocialPairing: false,
        hasSeedlessVault: true,
      });
      const hook = renderHookWithProvider(() => useAutoSignIn(), { state });

      await act(async () => {
        await hook.result.current.autoSignIn();
      });

      expect(mockPerformSignInAction).not.toHaveBeenCalled();
    });
  });
});
