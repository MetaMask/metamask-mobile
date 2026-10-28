import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Profile, XProfile } from '@metamask/profile-controller';
import { strings } from '../../../../../../locales/i18n';
import { resetResolvedSessionProfileIds, useMyProfile } from './useMyProfile';

const mockFetchAndUpdateProfile = jest.fn();
const mockFetchAndUpdateXAccount = jest.fn();
const mockUseSessionProfileId = jest.fn();
const mockUseSelector = jest.fn();
const mockControllerState: { profile: Profile | undefined } = {
  profile: undefined,
};

jest.mock(
  '../../../../../util/notifications/hooks/useSessionProfileId',
  () => ({
    useSessionProfileId: () => mockUseSessionProfileId(),
  }),
);

jest.mock('../../ManageProfileView/hooks/useProfileController', () => ({
  useProfileController: () => ({
    profile: mockControllerState.profile,
    fetchAndUpdateProfile: mockFetchAndUpdateProfile,
    fetchAndUpdateXAccount: mockFetchAndUpdateXAccount,
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: (...args: unknown[]) => mockUseSelector(...args),
}));

const mockLocalSnapshot = { profile: null };

jest.mock('./localSocialProfileStore', () => ({
  subscribeLocalSocialProfile: () => () => undefined,
  getLocalSocialProfileSnapshot: () => mockLocalSnapshot,
}));

const controllerProfile: Profile = {
  profileId: 'profile-123',
  username: 'alice',
  displayName: 'Alice',
  bio: 'hi',
  linkedAddresses: ['eip155:1:0x123'] as Profile['linkedAddresses'],
  avatarUrl: '',
  tradingPrivacy: 'public',
  connectedToX: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('useMyProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetResolvedSessionProfileIds();
    mockControllerState.profile = controllerProfile;
    mockUseSessionProfileId.mockReturnValue({
      profileId: 'profile-123',
      isLoading: false,
    });
    mockUseSelector.mockReturnValue(undefined);
    mockFetchAndUpdateProfile.mockResolvedValue(controllerProfile);
    mockFetchAndUpdateXAccount.mockResolvedValue({} as XProfile);
  });

  it('hydrates the controller profile on mount', async () => {
    const { result } = renderHook(() => useMyProfile());

    await waitFor(() => {
      expect(mockFetchAndUpdateProfile).toHaveBeenCalledWith('profile-123');
    });

    expect(result.current.profile?.handle).toBe('alice');
    expect(result.current.profile?.joinedAt).toBe('2026-01-01T00:00:00Z');
    expect(result.current.error).toBeNull();
  });

  it('does not hydrate the controller profile when disabled', () => {
    const { result } = renderHook(() => useMyProfile({ enabled: false }));

    expect(mockFetchAndUpdateProfile).not.toHaveBeenCalled();
    expect(result.current.profile?.handle).toBe('alice');
    expect(result.current.isLoading).toBe(false);
  });

  it('treats a missing profile as empty instead of an error', async () => {
    mockFetchAndUpdateProfile.mockRejectedValue(
      new Error('GET_PROFILE_FAILED: 404'),
    );
    mockControllerState.profile = undefined;

    const { result } = renderHook(() => useMyProfile());

    await waitFor(() => {
      expect(mockFetchAndUpdateProfile).toHaveBeenCalledTimes(1);
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('surfaces a load error when hydration fails for a reason other than a missing profile', async () => {
    mockFetchAndUpdateProfile.mockRejectedValue(
      new Error('GET_PROFILE_FAILED: 500'),
    );
    mockControllerState.profile = undefined;

    const { result } = renderHook(() => useMyProfile());

    await waitFor(() => {
      expect(result.current.error).toBe(
        strings('social_leaderboard.my_profile.load_profile_error'),
      );
    });

    expect(result.current.profile).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('stays loading until the first hydration settles', async () => {
    mockControllerState.profile = undefined;
    let resolveFetch: (profile: Profile) => void = () => undefined;
    mockFetchAndUpdateProfile.mockImplementation(
      () =>
        new Promise<Profile>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { result } = renderHook(() => useMyProfile());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.profile).toBeNull();

    mockControllerState.profile = controllerProfile;
    await act(async () => {
      resolveFetch(controllerProfile);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.profile?.handle).toBe('alice');
  });

  it('does not wait again on remount once a lookup found no profile', async () => {
    mockControllerState.profile = undefined;
    mockFetchAndUpdateProfile.mockRejectedValue(
      new Error('GET_PROFILE_FAILED: 404'),
    );
    const firstMount = renderHook(() => useMyProfile());
    await waitFor(() => {
      expect(firstMount.result.current.isLoading).toBe(false);
    });
    firstMount.unmount();
    mockFetchAndUpdateProfile.mockImplementation(
      () => new Promise<Profile>(() => undefined),
    );

    const { result } = renderHook(() => useMyProfile());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.profile).toBeNull();
    expect(mockFetchAndUpdateProfile).toHaveBeenCalledTimes(2);
  });

  it('waits again on remount when the last lookup failed', async () => {
    mockControllerState.profile = undefined;
    mockFetchAndUpdateProfile.mockRejectedValue(
      new Error('GET_PROFILE_FAILED: 500'),
    );
    const firstMount = renderHook(() => useMyProfile());
    await waitFor(() => {
      expect(firstMount.result.current.isLoading).toBe(false);
    });
    firstMount.unmount();
    mockFetchAndUpdateProfile.mockImplementation(
      () => new Promise<Profile>(() => undefined),
    );

    const { result } = renderHook(() => useMyProfile());

    expect(result.current.isLoading).toBe(true);
  });

  it('shows loading on retry after a resolved lookup later fails', async () => {
    mockControllerState.profile = undefined;
    mockFetchAndUpdateProfile.mockRejectedValue(
      new Error('GET_PROFILE_FAILED: 404'),
    );
    const { result } = renderHook(() => useMyProfile());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    mockFetchAndUpdateProfile.mockRejectedValue(
      new Error('GET_PROFILE_FAILED: 500'),
    );
    await act(async () => {
      await result.current.refresh();
    });
    mockFetchAndUpdateProfile.mockImplementation(
      () => new Promise<Profile>(() => undefined),
    );

    act(() => {
      result.current.refresh().catch(() => undefined);
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('refreshes the linked X account without failing the profile', async () => {
    const connectedProfile = { ...controllerProfile, connectedToX: true };
    const xProfile = { username: 'alice_x' } as XProfile;
    mockControllerState.profile = connectedProfile;
    mockFetchAndUpdateProfile.mockResolvedValue(connectedProfile);
    mockFetchAndUpdateXAccount.mockResolvedValue(xProfile);
    mockUseSelector.mockReturnValue(xProfile);

    const { result } = renderHook(() => useMyProfile());

    await waitFor(() => {
      expect(mockFetchAndUpdateXAccount).toHaveBeenCalledTimes(1);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.profile?.handle).toBe('alice');
    expect(result.current.profile?.xHandle).toBe('alice_x');
  });

  it('keeps the profile when the X account refresh fails', async () => {
    const connectedProfile = { ...controllerProfile, connectedToX: true };
    mockControllerState.profile = connectedProfile;
    mockFetchAndUpdateProfile.mockResolvedValue(connectedProfile);
    mockFetchAndUpdateXAccount.mockRejectedValue(new Error('x unavailable'));

    const { result } = renderHook(() => useMyProfile());

    await waitFor(() => {
      expect(mockFetchAndUpdateXAccount).toHaveBeenCalledTimes(1);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.profile?.handle).toBe('alice');
    expect(result.current.isLoading).toBe(false);
  });

  it('hides a stored profile that belongs to another session', async () => {
    mockUseSessionProfileId.mockReturnValue({
      profileId: 'new-session-profile',
      isLoading: false,
    });
    mockFetchAndUpdateProfile.mockRejectedValue(
      new Error('GET_PROFILE_FAILED: 404'),
    );

    const { result } = renderHook(() => useMyProfile());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetchAndUpdateProfile).toHaveBeenCalledWith(
      'new-session-profile',
    );
    expect(result.current.profile).toBeNull();
  });

  it('shows the profile once the controller holds the current session profile', async () => {
    const newSessionProfile = {
      ...controllerProfile,
      profileId: 'new-session-profile',
      username: 'bob',
    };
    mockUseSessionProfileId.mockReturnValue({
      profileId: 'new-session-profile',
      isLoading: false,
    });
    let resolveFetch: (profile: Profile) => void = () => undefined;
    mockFetchAndUpdateProfile.mockImplementation(
      () =>
        new Promise<Profile>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { result } = renderHook(() => useMyProfile());

    expect(result.current.profile).toBeNull();

    mockControllerState.profile = newSessionProfile;
    await act(async () => {
      resolveFetch(newSessionProfile);
    });

    expect(result.current.profile?.handle).toBe('bob');
  });

  it('keeps showing the stored profile while the session is unresolved', () => {
    mockUseSessionProfileId.mockReturnValue({
      profileId: undefined,
      isLoading: true,
    });

    const { result } = renderHook(() => useMyProfile());

    expect(result.current.profile?.handle).toBe('alice');
  });

  it('refreshes the profile through fetchAndUpdateProfile', async () => {
    const { result } = renderHook(() => useMyProfile());

    await waitFor(() => {
      expect(mockFetchAndUpdateProfile).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockFetchAndUpdateProfile).toHaveBeenCalledTimes(2);
  });
});
