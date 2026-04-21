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

  it('passes the resolved environment to the service constructor', () => {
    const originalEnv = process.env.METAMASK_ENVIRONMENT;
    process.env.METAMASK_ENVIRONMENT = 'production';

    try {
      authenticatedUserStorageServiceInit(getInitRequestMock());

      expect(AuthenticatedUserStorageService).toHaveBeenCalledWith(
        expect.objectContaining({ environment: 'prod' }),
      );
    } finally {
      process.env.METAMASK_ENVIRONMENT = originalEnv;
    }
  });
});

describe('getAuthenticatedUserStorageEnvironment', () => {
  const originalEnv = process.env.METAMASK_ENVIRONMENT;

  afterEach(() => {
    process.env.METAMASK_ENVIRONMENT = originalEnv;
  });

  describe('Production Environment', () => {
    it('returns prod when METAMASK_ENVIRONMENT is production', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      expect(getAuthenticatedUserStorageEnvironment()).toBe('prod');
    });

    it('returns prod when METAMASK_ENVIRONMENT is beta', () => {
      process.env.METAMASK_ENVIRONMENT = 'beta';
      expect(getAuthenticatedUserStorageEnvironment()).toBe('prod');
    });

    it('returns prod when METAMASK_ENVIRONMENT is rc', () => {
      process.env.METAMASK_ENVIRONMENT = 'rc';
      expect(getAuthenticatedUserStorageEnvironment()).toBe('prod');
    });
  });

  describe('Dev Environment', () => {
    it('returns dev when METAMASK_ENVIRONMENT is dev', () => {
      process.env.METAMASK_ENVIRONMENT = 'dev';
      expect(getAuthenticatedUserStorageEnvironment()).toBe('dev');
    });

    it('returns dev when METAMASK_ENVIRONMENT is exp', () => {
      process.env.METAMASK_ENVIRONMENT = 'exp';
      expect(getAuthenticatedUserStorageEnvironment()).toBe('dev');
    });

    it('returns dev when METAMASK_ENVIRONMENT is test', () => {
      process.env.METAMASK_ENVIRONMENT = 'test';
      expect(getAuthenticatedUserStorageEnvironment()).toBe('dev');
    });

    it('returns dev when METAMASK_ENVIRONMENT is e2e', () => {
      process.env.METAMASK_ENVIRONMENT = 'e2e';
      expect(getAuthenticatedUserStorageEnvironment()).toBe('dev');
    });

    it('returns dev when METAMASK_ENVIRONMENT is not set', () => {
      delete process.env.METAMASK_ENVIRONMENT;
      expect(getAuthenticatedUserStorageEnvironment()).toBe('dev');
    });

    it('returns dev when METAMASK_ENVIRONMENT is an unknown value', () => {
      process.env.METAMASK_ENVIRONMENT = 'unknown';
      expect(getAuthenticatedUserStorageEnvironment()).toBe('dev');
    });
  });
});
