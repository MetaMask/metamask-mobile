import { act, waitFor } from '@testing-library/react-native';
import type { RootState } from '../../../../reducers';
import {
  renderHookWithProvider,
  type DeepPartial,
} from '../../../test/renderWithProvider';
import { useAutoSignIn, useAutoSignOut } from '../useAuthentication';
import { useAccountSyncing } from '../useAccountSyncing';
import { useContactSyncing } from '../useContactSyncing';
import { useIdentityEffects } from './useIdentityEffects';

/** Runtime strings aligned with `ProfilePairingStatus` from seedless onboarding. */
const ProfilePairingStatusFixture = {
  NotPaired: 'not_paired',
} as const;
jest.mock('../useAuthentication');
jest.mock('../useAccountSyncing');
jest.mock('../useContactSyncing');
jest.mock('../../../../core/Braze/hooks', () => ({
  useBrazeIdentity: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => {
  const mockMessengerCall = jest.fn().mockResolvedValue('bearer-token');
  const mockPairProfile = jest.fn().mockResolvedValue(undefined);
  return {
    __esModule: true,
    default: {
      controllerMessenger: {
        call: mockMessengerCall,
      },
      context: {
        SeedlessOnboardingController: {
          pairProfileServiceWithSocialLogin: mockPairProfile,
        },
      },
    },
    mockMessengerCall,
    mockPairProfile,
  };
});

/** Minimal store so useProfilePairing → useShouldPairProfile selectors do not read undefined KeyringController. */
const useIdentityEffectsProviderState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      KeyringController: {
        isUnlocked: false,
        keyrings: [],
      },
    },
  },
  onboarding: {
    completedOnboarding: false,
  },
  settings: {
    basicFunctionalityEnabled: false,
  },
};

const profilePairingReadyState = {
  engine: {
    backgroundState: {
      KeyringController: {
        isUnlocked: true,
        keyrings: [],
      },
      AuthenticationController: {
        isSignedIn: true,
      },
      SeedlessOnboardingController: {
        profilePairingToken: 'profile-pairing-token',
        socialBackupsMetadata: [
          {
            profilePairingStatus: ProfilePairingStatusFixture.NotPaired,
          },
        ],
      },
    },
  },
  onboarding: {
    completedOnboarding: true,
  },
  settings: {
    basicFunctionalityEnabled: true,
  },
} as unknown as DeepPartial<RootState>;

const getEngineMocksFromIdentityEffectsSuite = () =>
  jest.requireMock('../../../../core/Engine') as {
    mockMessengerCall: jest.Mock;
    mockPairProfile: jest.Mock;
  };

describe('useIdentityEffects', () => {
  const mockUseAutoSignIn = jest.mocked(useAutoSignIn);
  const mockUseAutoSignOut = jest.mocked(useAutoSignOut);
  const mockUseAccountSyncing = jest.mocked(useAccountSyncing);
  const mockUseContactSyncing = jest.mocked(useContactSyncing);

  beforeEach(() => {
    const engineMocks = getEngineMocksFromIdentityEffectsSuite();
    engineMocks.mockMessengerCall.mockClear();
    engineMocks.mockPairProfile.mockClear();

    mockUseAutoSignIn.mockReturnValue({
      autoSignIn: jest.fn(),
      shouldAutoSignIn: false,
      setHasNewKeyrings: jest.fn(),
    });

    mockUseAutoSignOut.mockReturnValue({
      autoSignOut: jest.fn(),
      shouldAutoSignOut: false,
    });

    mockUseAccountSyncing.mockReturnValue({
      dispatchAccountSyncing: jest.fn(),
      shouldDispatchAccountSyncing: false,
    });

    mockUseContactSyncing.mockReturnValue({
      dispatchContactSyncing: jest.fn(),
      shouldDispatchContactSyncing: false,
    });
  });

  it('calls autoSignIn if shouldAutoSignIn returns true', () => {
    const autoSignIn = jest.fn();
    const shouldAutoSignIn = true;
    mockUseAutoSignIn.mockReturnValue({
      autoSignIn,
      shouldAutoSignIn,
      setHasNewKeyrings: jest.fn(),
    });

    renderHookWithProvider(() => useIdentityEffects(), {
      state: useIdentityEffectsProviderState,
    });

    expect(autoSignIn).toHaveBeenCalled();
  });

  it('does not call autoSignIn if shouldAutoSignIn returns false', () => {
    const autoSignIn = jest.fn();
    const shouldAutoSignIn = false;
    mockUseAutoSignIn.mockReturnValue({
      autoSignIn,
      shouldAutoSignIn,
      setHasNewKeyrings: jest.fn(),
    });

    renderHookWithProvider(() => useIdentityEffects(), {
      state: useIdentityEffectsProviderState,
    });

    expect(autoSignIn).not.toHaveBeenCalled();
  });

  it('calls autoSignOut if shouldAutoSignOut returns true', () => {
    const autoSignOut = jest.fn();
    const shouldAutoSignOut = true;
    mockUseAutoSignOut.mockReturnValue({
      autoSignOut,
      shouldAutoSignOut,
    });

    renderHookWithProvider(() => useIdentityEffects(), {
      state: useIdentityEffectsProviderState,
    });

    expect(autoSignOut).toHaveBeenCalled();
  });

  it('does not call autoSignOut if shouldAutoSignOut returns false', () => {
    const autoSignOut = jest.fn();
    const shouldAutoSignOut = false;
    mockUseAutoSignOut.mockReturnValue({
      autoSignOut,
      shouldAutoSignOut,
    });

    renderHookWithProvider(() => useIdentityEffects(), {
      state: useIdentityEffectsProviderState,
    });

    expect(autoSignOut).not.toHaveBeenCalled();
  });

  it('dispatches account syncing if shouldDispatchAccountSyncing returns true', () => {
    const dispatchAccountSyncing = jest.fn();
    const shouldDispatchAccountSyncing = true;
    mockUseAccountSyncing.mockReturnValue({
      dispatchAccountSyncing,
      shouldDispatchAccountSyncing,
    });

    renderHookWithProvider(() => useIdentityEffects(), {
      state: useIdentityEffectsProviderState,
    });

    expect(dispatchAccountSyncing).toHaveBeenCalled();
  });

  it('dispatches contact syncing if shouldDispatchContactSyncing returns true', () => {
    const dispatchContactSyncing = jest.fn();
    const shouldDispatchContactSyncing = true;
    mockUseContactSyncing.mockReturnValue({
      dispatchContactSyncing,
      shouldDispatchContactSyncing,
    });

    renderHookWithProvider(() => useIdentityEffects(), {
      state: useIdentityEffectsProviderState,
    });

    expect(dispatchContactSyncing).toHaveBeenCalled();
  });

  it('does not dispatch account syncing if shouldDispatchAccountSyncing returns false', () => {
    const dispatchAccountSyncing = jest.fn();
    const shouldDispatchAccountSyncing = false;
    mockUseAccountSyncing.mockReturnValue({
      dispatchAccountSyncing,
      shouldDispatchAccountSyncing,
    });

    renderHookWithProvider(() => useIdentityEffects(), {
      state: useIdentityEffectsProviderState,
    });

    expect(dispatchAccountSyncing).not.toHaveBeenCalled();
  });

  it('does not dispatch contact syncing if shouldDispatchContactSyncing returns false', () => {
    const dispatchContactSyncing = jest.fn();
    const shouldDispatchContactSyncing = false;
    mockUseContactSyncing.mockReturnValue({
      dispatchContactSyncing,
      shouldDispatchContactSyncing,
    });

    renderHookWithProvider(() => useIdentityEffects(), {
      state: useIdentityEffectsProviderState,
    });

    expect(dispatchContactSyncing).not.toHaveBeenCalled();
  });

  it('runs profile pairing when store state satisfies useShouldPairProfile', async () => {
    const { mockMessengerCall, mockPairProfile } =
      getEngineMocksFromIdentityEffectsSuite();

    renderHookWithProvider(() => useIdentityEffects(), {
      state: profilePairingReadyState,
    });

    await waitFor(() => {
      expect(mockMessengerCall).toHaveBeenCalledWith(
        'AuthenticationController:getBearerToken',
      );
    });

    await waitFor(() => {
      expect(mockPairProfile).toHaveBeenCalledWith('bearer-token');
    });
  });

  it('does not invoke profile pairing when pairing prerequisites are missing', async () => {
    const { mockMessengerCall, mockPairProfile } =
      getEngineMocksFromIdentityEffectsSuite();

    renderHookWithProvider(() => useIdentityEffects(), {
      state: useIdentityEffectsProviderState,
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockMessengerCall).not.toHaveBeenCalled();
    expect(mockPairProfile).not.toHaveBeenCalled();
  });
});
