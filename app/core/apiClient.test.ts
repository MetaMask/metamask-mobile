import { createApiPlatformClient } from '@metamask/core-backend';
import { isBackendAuthDisabled } from './coreBackendApiUrls';
import Engine from './Engine';
import './apiClient';

jest.mock('./coreBackendApiUrls', () => ({
  getBackendApiUrlsOption: jest.fn(() => ({})),
  isBackendAuthDisabled: jest.fn(() => false),
}));

jest.mock('@metamask/core-backend', () => ({
  createApiPlatformClient: jest.fn(() => ({ accounts: {} })),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '7.0.0'),
}));

jest.mock('./Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AuthenticationController: {
        getBearerToken: jest.fn(),
      },
    },
  },
}));

const createApiPlatformClientMock = jest.mocked(createApiPlatformClient);
const isBackendAuthDisabledMock = jest.mocked(isBackendAuthDisabled);
const getBearerTokenMock = jest.mocked(
  Engine.context.AuthenticationController.getBearerToken,
);

const [firstCallArgs] = createApiPlatformClientMock.mock.calls;
const getBearerToken = firstCallArgs[0].getBearerToken as () => Promise<
  string | undefined
>;

describe('apiClient', () => {
  beforeEach(() => {
    getBearerTokenMock.mockReset();
  });

  it('creates the API platform client with the mobile product identifier', () => {
    expect(createApiPlatformClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clientProduct: 'metamask-mobile',
        clientVersion: '7.0.0',
        getBearerToken: expect.any(Function),
      }),
    );
  });

  it('returns the bearer token from AuthenticationController', async () => {
    getBearerTokenMock.mockResolvedValueOnce('bearer-token-mock');

    await expect(getBearerToken()).resolves.toBe('bearer-token-mock');
    expect(getBearerTokenMock).toHaveBeenCalled();
  });

  it('returns undefined when AuthenticationController throws', async () => {
    getBearerTokenMock.mockRejectedValueOnce(new Error('boom'));

    await expect(getBearerToken()).resolves.toBeUndefined();
  });

  it('skips the bearer token when backend auth is disabled', async () => {
    isBackendAuthDisabledMock.mockReturnValueOnce(true);

    await expect(getBearerToken()).resolves.toBeUndefined();
    expect(getBearerTokenMock).not.toHaveBeenCalled();
  });
});
