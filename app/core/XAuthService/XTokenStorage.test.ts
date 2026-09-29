import * as Keychain from 'react-native-keychain'; // eslint-disable-line import-x/no-namespace
import { setTokens, getTokens, clearTokens } from './XTokenStorage';
import type { XTokens } from './types';

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  },
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

jest.mock('../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

const X_OAUTH_KEYCHAIN_SERVICE = 'com.metamask.x-oauth';

const sampleTokens: XTokens = {
  accessToken: 'access-123',
  refreshToken: 'refresh-456',
  expiresAt: 1735689600000,
};

describe('XTokenStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setTokens', () => {
    it('stores the tokens as JSON under the dedicated X OAuth keychain service', async () => {
      await setTokens(sampleTokens);

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'x-oauth-tokens',
        JSON.stringify(sampleTokens),
        {
          service: X_OAUTH_KEYCHAIN_SERVICE,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        },
      );
    });
  });

  describe('getTokens', () => {
    it('returns the parsed tokens when present', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: 'x-oauth-tokens',
        password: JSON.stringify(sampleTokens),
      });

      const result = await getTokens();

      expect(Keychain.getGenericPassword).toHaveBeenCalledWith({
        service: X_OAUTH_KEYCHAIN_SERVICE,
      });
      expect(result).toEqual(sampleTokens);
    });

    it('returns null when no tokens are stored', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

      const result = await getTokens();

      expect(result).toBeNull();
    });
  });

  describe('clearTokens', () => {
    it('resets the dedicated X OAuth keychain scope', async () => {
      await clearTokens();

      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: X_OAUTH_KEYCHAIN_SERVICE,
      });
    });
  });
});
