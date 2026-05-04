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
  // The environment is pinned to `'prod'` to match `AuthenticationController`,
  // which always mints PRD tokens on mobile. `METAMASK_ENVIRONMENT` therefore
  // has no effect on this resolver — these cases document that contract so a
  // future refactor doesn't silently reintroduce the token/env mismatch that
  // caused 403 "invalid access token" responses.
  const originalEnv = process.env.METAMASK_ENVIRONMENT;

  afterEach(() => {
    process.env.METAMASK_ENVIRONMENT = originalEnv;
  });

  it.each(['production', 'beta', 'rc', 'dev', 'exp', 'test', 'e2e', 'unknown'])(
    'returns prod regardless of METAMASK_ENVIRONMENT=%s',
    (value) => {
      process.env.METAMASK_ENVIRONMENT = value;
      expect(getAuthenticatedUserStorageEnvironment()).toBe('prod');
    },
  );

  it('returns prod when METAMASK_ENVIRONMENT is unset', () => {
    delete process.env.METAMASK_ENVIRONMENT;
    expect(getAuthenticatedUserStorageEnvironment()).toBe('prod');
  });
});
