import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';
import {
  ProfileService,
  type ProfileServiceMessenger,
} from '@metamask/profile-controller';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getProfileServiceMessenger } from '../messengers/profile-service-messenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import type { MessengerClientInitRequest } from '../types';
import {
  getProfileApiBaseUrl,
  profileServiceInit,
} from './profile-service-init';

type BaseMessenger = ExtendedMessenger<
  MockAnyNamespace,
  AuthenticationController.AuthenticationControllerGetBearerTokenAction
>;

const createBaseMessenger = (): BaseMessenger =>
  new ExtendedMessenger({ namespace: MOCK_ANY_NAMESPACE });

function getInitRequestMock(
  baseMessenger: BaseMessenger = createBaseMessenger(),
): jest.Mocked<MessengerClientInitRequest<ProfileServiceMessenger>> {
  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getProfileServiceMessenger(baseMessenger),
  };
}

describe('getProfileApiBaseUrl', () => {
  afterEach(() => {
    delete process.env.MM_API_ENV;
    delete process.env.PROFILE_API_URL;
  });

  it('returns the prod URL by default', () => {
    expect(getProfileApiBaseUrl()).toBe(
      'https://profile-api.api.cx.metamask.io',
    );
  });

  it('returns the dev URL when MM_API_ENV=dev', () => {
    process.env.MM_API_ENV = 'dev';
    expect(getProfileApiBaseUrl()).toBe(
      'https://profile-api.dev-api.cx.metamask.io',
    );
  });

  it('returns the uat URL when MM_API_ENV=uat', () => {
    process.env.MM_API_ENV = 'uat';
    expect(getProfileApiBaseUrl()).toBe(
      'https://profile-api.uat-api.cx.metamask.io',
    );
  });

  it('prefers PROFILE_API_URL override over the env-derived URL', () => {
    process.env.MM_API_ENV = 'dev';
    process.env.PROFILE_API_URL = 'https://profile.test/api';
    expect(getProfileApiBaseUrl()).toBe('https://profile.test/api');
  });
});

describe('profileServiceInit', () => {
  afterEach(() => {
    delete process.env.PROFILE_API_URL;
    jest.restoreAllMocks();
  });

  it('instantiates a real ProfileService', () => {
    const request = getInitRequestMock();
    const { controller } = profileServiceInit(request);
    expect(controller).toBeInstanceOf(ProfileService);
    controller.destroy();
  });

  it('calls the profile API with the correct URL', async () => {
    process.env.PROFILE_API_URL = 'https://profile.test/api';
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ message: 'not found' }), { status: 404 }),
      );
    const baseMessenger = createBaseMessenger();
    baseMessenger.registerActionHandler(
      'AuthenticationController:getBearerToken',
      async () => 'token',
    );
    const request = getInitRequestMock(baseMessenger);
    const { controller } = profileServiceInit(request);

    await expect(
      request.controllerMessenger.call('ProfileService:getProfile', 'p-1'),
    ).rejects.toThrow('404');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://profile.test/api/v1/profiles/p-1',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      }),
    );
    controller.destroy();
  });
});
