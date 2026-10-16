import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Profile, XProfile } from '@metamask/profile-controller';
import { useMyProfile } from './useMyProfile';

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

  it('treats a missing profile as empty instead of an error', async () => {
    mockFetchAndUpdateProfile.mockRejectedValue(
      new Error('GET_PROFILE_FAILED: 404'),
    );
    mockControllerState.profile = undefined;

    const { result } = renderHook(() => useMyProfile());

    await waitFor(() => {
      expect(mockFetchAndUpdateProfile).toHaveBeenCalledTimes(1);
    });

    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBeNull();
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
