import { act, waitFor } from '@testing-library/react-native';
import type { RootState } from '../../../../reducers';

import {
  renderHookWithProvider,
  type DeepPartial,
} from '../../../test/renderWithProvider';
import Logger from '../../../Logger';

import { useProfilePairing, useShouldPairProfile } from './useProfilePairing';

/** Runtime values aligned with `@metamask/seedless-onboarding-controller` `ProfilePairingStatus`. */
const ProfilePairingStatusFixture = {
  NotPaired: 'not_paired',
  Paired: 'paired',
} as const;

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

jest.mock('../../../Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const getEngineMocks = () =>
  jest.requireMock('../../../../core/Engine') as {
    mockMessengerCall: jest.Mock;
    mockPairProfile: jest.Mock;
  };

interface PairingFixtureState {
  isUnlocked?: boolean;
  isSignedIn?: boolean;
  completedOnboarding?: boolean;
  basicFunctionalityEnabled?: boolean;
  profilePairingToken?: string | undefined;
  profilePairingStatus?:
    | (typeof ProfilePairingStatusFixture)[keyof typeof ProfilePairingStatusFixture]
    | undefined;
}

const pairingStoreState = (overrides: PairingFixtureState = {}) => {
  const base: Required<Omit<PairingFixtureState, 'profilePairingToken'>> & {
    profilePairingToken: string | undefined;
  } = {
    isUnlocked: true,
    isSignedIn: true,
    completedOnboarding: true,
    basicFunctionalityEnabled: true,
    profilePairingToken: 'pairing-token',
    profilePairingStatus: ProfilePairingStatusFixture.NotPaired,
  };

  const {
    isUnlocked,
    isSignedIn,
    completedOnboarding,
    basicFunctionalityEnabled,
    profilePairingToken,
    profilePairingStatus,
  } = { ...base, ...overrides };

  return {
    engine: {
      backgroundState: {
        KeyringController: {
          isUnlocked,
          keyrings: [],
        },
        AuthenticationController: {
          isSignedIn,
        },
        SeedlessOnboardingController: {
          profilePairingToken,
          socialBackupsMetadata: profilePairingStatus
            ? [{ profilePairingStatus }]
            : [],
        },
      },
    },
    settings: {
      basicFunctionalityEnabled,
    },
    onboarding: {
      completedOnboarding,
    },
  };
};

describe('useShouldPairProfile', () => {
  it('returns true when prerequisites are satisfied and profile is not paired', () => {
    const { result } = renderHookWithProvider(() => useShouldPairProfile(), {
      state: pairingStoreState() as DeepPartial<RootState>,
    });

    expect(result.current).toBe(true);
  });

  it('returns false when KeyringController is locked', () => {
    const { result } = renderHookWithProvider(() => useShouldPairProfile(), {
      state: pairingStoreState({ isUnlocked: false }) as DeepPartial<RootState>,
    });

    expect(result.current).toBe(false);
  });

  it('returns false when profile pairing token is absent', () => {
    const { result } = renderHookWithProvider(() => useShouldPairProfile(), {
      state: pairingStoreState({
        profilePairingToken: undefined,
      }) as DeepPartial<RootState>,
    });

    expect(result.current).toBe(false);
  });

  it('returns false when social backup pairing status is already paired', () => {
    const { result } = renderHookWithProvider(() => useShouldPairProfile(), {
      state: pairingStoreState({
        profilePairingStatus: ProfilePairingStatusFixture.Paired,
      }) as DeepPartial<RootState>,
    });

    expect(result.current).toBe(false);
  });
});

describe('useProfilePairing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not invoke Engine pairing when prerequisites are not met', async () => {
    const { mockMessengerCall, mockPairProfile } = getEngineMocks();
    const { result } = renderHookWithProvider(() => useProfilePairing(), {
      state: pairingStoreState({ isSignedIn: false }) as DeepPartial<RootState>,
    });

    expect(result.current.shouldPairProfile).toBe(false);

    await act(async () => {
      result.current.dispatchProfilePairing();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockMessengerCall).not.toHaveBeenCalled();
    expect(mockPairProfile).not.toHaveBeenCalled();
  });

  it('requests bearer token and pairs profile when prerequisites are satisfied', async () => {
    const { mockMessengerCall, mockPairProfile } = getEngineMocks();

    const { result } = renderHookWithProvider(() => useProfilePairing(), {
      state: pairingStoreState() as DeepPartial<RootState>,
    });

    expect(result.current.shouldPairProfile).toBe(true);

    await act(async () => {
      result.current.dispatchProfilePairing();
      await Promise.resolve();
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

  it('logs pairing failures without rethrowing', async () => {
    const loggerError = jest.mocked(Logger.error);
    const { mockMessengerCall, mockPairProfile } = getEngineMocks();
    mockPairProfile.mockRejectedValueOnce(new Error('pair failed'));

    const { result } = renderHookWithProvider(() => useProfilePairing(), {
      state: pairingStoreState() as DeepPartial<RootState>,
    });

    await act(async () => {
      result.current.dispatchProfilePairing();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockMessengerCall).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(loggerError).toHaveBeenCalled();
    });
  });
});
