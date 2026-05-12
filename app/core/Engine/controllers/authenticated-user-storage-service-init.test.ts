import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getAuthenticatedUserStorageServiceMessenger } from '../messengers/authenticated-user-storage-service-messenger';
import {
  authenticatedUserStorageServiceInit,
  getAuthenticatedUserStorageEnvironment,
} from './authenticated-user-storage-service-init';
import {
  AuthenticatedUserStorageService,
  type AuthenticatedUserStorageMessenger,
} from '@metamask/authenticated-user-storage';
import { MessengerClientInitRequest } from '../types';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/authenticated-user-storage', () => ({
  AuthenticatedUserStorageService: jest.fn(),
}));

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<AuthenticatedUserStorageMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger:
      getAuthenticatedUserStorageServiceMessenger(baseMessenger),
  };
}

describe('authenticatedUserStorageServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('instantiates the AuthenticatedUserStorageService', () => {
    const { controller } =
      authenticatedUserStorageServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(AuthenticatedUserStorageService);
  });

  it('passes prod as the environment to the service constructor', () => {
    authenticatedUserStorageServiceInit(getInitRequestMock());

    expect(AuthenticatedUserStorageService).toHaveBeenCalledWith(
      expect.objectContaining({ environment: 'prod' }),
    );
  });
});

describe('getAuthenticatedUserStorageEnvironment', () => {
  // Tracks `MM_DEV_API_ENV` so it agrees with the env the auth controller
  // mints JWTs for — a PRD token will 403 against dev/uat user-storage and
  // vice versa.
  afterEach(() => {
    delete process.env.MM_DEV_API_ENV;
  });

  it('returns prod when MM_DEV_API_ENV is unset', () => {
    expect(getAuthenticatedUserStorageEnvironment()).toBe('prod');
  });

  it.each(['dev', 'uat', 'prod'] as const)(
    'tracks MM_DEV_API_ENV=%s',
    (value) => {
      process.env.MM_DEV_API_ENV = value;
      expect(getAuthenticatedUserStorageEnvironment()).toBe(value);
    },
  );

  it('falls back to prod for unrecognized MM_DEV_API_ENV values', () => {
    process.env.MM_DEV_API_ENV = 'nonsense';
    expect(getAuthenticatedUserStorageEnvironment()).toBe('prod');
  });
});
