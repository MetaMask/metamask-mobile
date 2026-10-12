import { renderHook } from '@testing-library/react-native';
import { useProfileController } from './useProfileController';

const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
const mockCheckUsernameAvailability = jest.fn().mockResolvedValue({});
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
    ]);

    expect(mockUpdateProfile).toHaveBeenCalledWith({ username: 'bob' });
    expect(mockCheckUsernameAvailability).toHaveBeenCalledWith('bob');
  });
});
