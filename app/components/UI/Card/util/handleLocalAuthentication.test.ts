import { handleLocalAuthentication } from './handleLocalAuthentication';
import { tokenManager } from './tokenManager';

jest.mock('./tokenManager', () => ({
  tokenManager: {
    checkAuthenticationStatus: jest.fn(),
  },
}));

const mockCheckAuthenticationStatus = jest.mocked(
  tokenManager.checkAuthenticationStatus,
);

describe('handleLocalAuthentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Baanx login disabled', () => {
    it('returns not authenticated when Baanx login is disabled', async () => {
      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: false,
      });

      expect(result).toEqual({
        isAuthenticated: false,
      });
      expect(mockCheckAuthenticationStatus).not.toHaveBeenCalled();
    });
  });

  describe('Delegates to TokenManager', () => {
    it('returns authenticated when TokenManager reports authenticated', async () => {
      mockCheckAuthenticationStatus.mockResolvedValue({
        isAuthenticated: true,
        userCardLocation: 'us',
      });

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(result).toEqual({
        isAuthenticated: true,
        userCardLocation: 'us',
      });
      expect(mockCheckAuthenticationStatus).toHaveBeenCalledTimes(1);
    });

    it('returns not authenticated when TokenManager reports not authenticated', async () => {
      mockCheckAuthenticationStatus.mockResolvedValue({
        isAuthenticated: false,
      });

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(result).toEqual({
        isAuthenticated: false,
      });
    });

    it('returns authenticated with international location', async () => {
      mockCheckAuthenticationStatus.mockResolvedValue({
        isAuthenticated: true,
        userCardLocation: 'international',
      });

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(result).toEqual({
        isAuthenticated: true,
        userCardLocation: 'international',
      });
    });
  });

  describe('Error handling', () => {
    it('returns not authenticated when TokenManager throws', async () => {
      mockCheckAuthenticationStatus.mockRejectedValue(
        new Error('Unexpected error'),
      );

      const result = await handleLocalAuthentication({
        isBaanxLoginEnabled: true,
      });

      expect(result).toEqual({
        isAuthenticated: false,
      });
    });
  });
});
