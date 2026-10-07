import {
  ProfileService,
  ProfileServiceMessenger,
} from '@metamask/profile-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { MessengerClientInitRequest } from '../types';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { profileServiceInit } from './profile-service-init';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getProfileServiceMessenger } from '../messengers/profile-service-messenger';

jest.mock('@metamask/profile-controller');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<ProfileServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getProfileServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };
}

describe('profileServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.PROFILE_API_URL;
    delete process.env.MM_API_ENV;
  });

  it('initializes the service', () => {
    const { controller } = profileServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(ProfileService);
  });

  it('uses the prod URL by default', () => {
    profileServiceInit(getInitRequestMock());

    expect(jest.mocked(ProfileService)).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://profile-api.api.cx.metamask.io',
        messenger: expect.any(Object),
      }),
    );
  });

  it('uses the dev URL when MM_API_ENV is dev', () => {
    process.env.MM_API_ENV = 'dev';

    profileServiceInit(getInitRequestMock());

    expect(jest.mocked(ProfileService)).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://profile-api.dev-api.cx.metamask.io',
      }),
    );
  });

  it('uses the uat URL when MM_API_ENV is uat', () => {
    process.env.MM_API_ENV = 'uat';

    profileServiceInit(getInitRequestMock());

    expect(jest.mocked(ProfileService)).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://profile-api.uat-api.cx.metamask.io',
      }),
    );
  });

  it('uses PROFILE_API_URL override when set', () => {
    process.env.PROFILE_API_URL = 'http://localhost:3000';

    profileServiceInit(getInitRequestMock());

    expect(jest.mocked(ProfileService)).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'http://localhost:3000',
      }),
    );
  });
});
