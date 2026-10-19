import { renderHook } from '@testing-library/react-native';
import { useProfileController } from './useProfileController';

const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
const mockCheckUsernameAvailability = jest.fn().mockResolvedValue({});
const mockFetchAndUpdateProfile = jest.fn().mockResolvedValue({});
const mockFetchAndUpdateXAccount = jest.fn().mockResolvedValue({});
const mockDisconnectX = jest.fn().mockResolvedValue(undefined);

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
  },
}));

describe('useProfileController', () => {
  it('reads profile state and delegates profile mutations', async () => {
    const { result } = renderHook(() => useProfileController());

    await Promise.all([
      result.current.updateProfile({ username: 'bob' }),
      result.current.checkUsernameAvailability('bob'),
      result.current.fetchAndUpdateProfile('profile-123'),
      result.current.fetchAndUpdateXAccount(),
      result.current.disconnectX('profile-123'),
    ]);

    expect(mockUpdateProfile).toHaveBeenCalledWith({ username: 'bob' });
    expect(mockCheckUsernameAvailability).toHaveBeenCalledWith('bob');
    expect(mockFetchAndUpdateProfile).toHaveBeenCalledWith('profile-123');
    expect(mockFetchAndUpdateXAccount).toHaveBeenCalledTimes(1);
    expect(mockDisconnectX).toHaveBeenCalledWith('profile-123');
  });
});
