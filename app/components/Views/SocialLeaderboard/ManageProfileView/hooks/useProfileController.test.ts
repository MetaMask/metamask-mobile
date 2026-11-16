import { renderHook } from '@testing-library/react-native';
import {
  resetProfileMutationVersion,
  useProfileController,
} from './useProfileController';

const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
const mockCheckUsernameAvailability = jest.fn().mockResolvedValue({});
const mockFetchAndUpdateProfile = jest.fn().mockResolvedValue({});
const mockFetchAndUpdateXAccount = jest.fn().mockResolvedValue({});
const mockDisconnectX = jest.fn().mockResolvedValue(undefined);
const mockInvalidateQueries = jest.fn().mockResolvedValue(undefined);

jest.mock('react-redux', () => ({
  useSelector: jest
    .fn()
    .mockReturnValueOnce({ profileId: 'profile-123' })
    .mockReturnValueOnce({ profile: { linkedAddresses: [] } }),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    ProfileController: {
      updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
      createProfile: jest.fn(),
      getXAuthorizationUrl: jest.fn(),
      fetchAndUpdateProfile: (...args: unknown[]) =>
        mockFetchAndUpdateProfile(...args),
      fetchAndUpdateXAccount: (...args: unknown[]) =>
        mockFetchAndUpdateXAccount(...args),
      disconnectX: (...args: unknown[]) => mockDisconnectX(...args),
      checkUsernameAvailability: (...args: unknown[]) =>
        mockCheckUsernameAvailability(...args),
    },
    ProfileService: {
      invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
    },
  },
}));

describe('useProfileController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetProfileMutationVersion();
    mockUpdateProfile.mockResolvedValue(undefined);
    mockFetchAndUpdateProfile.mockResolvedValue({});
    mockInvalidateQueries.mockResolvedValue(undefined);
  });

  it('reads profile state and delegates profile mutations', async () => {
    const { result } = renderHook(() => useProfileController());

    await result.current.updateProfile({ username: 'bob' });
    await result.current.checkUsernameAvailability('bob');
    await result.current.fetchAndUpdateProfile('profile-123');
    await result.current.fetchAndUpdateXAccount();
    await result.current.disconnectX('profile-123');

    expect(mockUpdateProfile).toHaveBeenCalledWith({ username: 'bob' });
    expect(mockCheckUsernameAvailability).toHaveBeenCalledWith('bob');
    expect(mockFetchAndUpdateProfile).toHaveBeenCalledWith('profile-123');
    expect(mockFetchAndUpdateXAccount).toHaveBeenCalledTimes(1);
    expect(mockDisconnectX).toHaveBeenCalledWith('profile-123');
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
    expect(mockFetchAndUpdateProfile).toHaveBeenCalledTimes(1);
  });

  it('reads the profile again when a fetch started before an edit finishes', async () => {
    let resolveStaleFetch: (profile: unknown) => void = () => undefined;
    mockFetchAndUpdateProfile
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveStaleFetch = resolve;
          }),
      )
      .mockResolvedValueOnce({ profileId: 'profile-123' });

    const { result } = renderHook(() => useProfileController());
    const fetchPromise = result.current.fetchAndUpdateProfile('profile-123');
    await result.current.updateProfile({ trading_privacy: 'private' });
    resolveStaleFetch({ profileId: 'profile-123', tradingPrivacy: 'public' });
    await fetchPromise;

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['ProfileService:getProfile', 'profile-123'],
    });
    expect(mockFetchAndUpdateProfile).toHaveBeenCalledTimes(2);
  });

  it('waits for an in-flight edit before reading the profile again', async () => {
    let resolveStaleFetch: (profile: unknown) => void = () => undefined;
    let resolveUpdate: () => void = () => undefined;
    mockFetchAndUpdateProfile
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveStaleFetch = resolve;
          }),
      )
      .mockResolvedValueOnce({
        profileId: 'profile-123',
        tradingPrivacy: 'private',
      });
    mockUpdateProfile.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = () => {
            resolve();
          };
        }),
    );

    const { result } = renderHook(() => useProfileController());
    const fetchPromise = result.current.fetchAndUpdateProfile('profile-123');
    const updatePromise = result.current.updateProfile({
      trading_privacy: 'private',
    });
    resolveStaleFetch({ profileId: 'profile-123', tradingPrivacy: 'public' });
    await Promise.resolve();

    expect(mockFetchAndUpdateProfile).toHaveBeenCalledTimes(1);
    expect(mockInvalidateQueries).not.toHaveBeenCalled();

    resolveUpdate();
    await updatePromise;
    await fetchPromise;

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['ProfileService:getProfile', 'profile-123'],
    });
    expect(mockFetchAndUpdateProfile).toHaveBeenCalledTimes(2);
  });

  it('reads the profile again after a failed edit', async () => {
    let resolveStaleFetch: (profile: unknown) => void = () => undefined;
    mockFetchAndUpdateProfile
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveStaleFetch = resolve;
          }),
      )
      .mockResolvedValueOnce({ profileId: 'profile-123' });
    mockUpdateProfile.mockRejectedValueOnce(new Error('profile update failed'));

    const { result } = renderHook(() => useProfileController());
    const fetchPromise = result.current.fetchAndUpdateProfile('profile-123');
    const updatePromise = result.current.updateProfile({
      trading_privacy: 'private',
    });
    resolveStaleFetch({ profileId: 'profile-123', tradingPrivacy: 'public' });

    await expect(updatePromise).rejects.toThrow('profile update failed');
    await fetchPromise;

    expect(mockFetchAndUpdateProfile).toHaveBeenCalledTimes(2);
  });
});
