import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';
import {
  ProfileService,
  type ProfileServiceMessenger,
} from '@metamask/profile-controller';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import type { CaipAccountId } from '@metamask/utils';
import AppConstants from '../../AppConstants';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getProfileServiceMessenger } from '../messengers/profile-service-messenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import type { MessengerClientInitRequest } from '../types';
import {
  createProfileServiceClient,
  profileServiceInit,
} from './profile-service-init';

const LINKED_ADDRESS =
  'eip155:1:0x0000000000000000000000000000000000000001' as CaipAccountId;

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

describe('profileServiceInit', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers the mock profile service by default', async () => {
    const request = getInitRequestMock();
    const { controller } = profileServiceInit(request);

    expect(controller).not.toBeInstanceOf(ProfileService);

    const created = await request.controllerMessenger.call(
      'ProfileService:createProfile',
      {
        profile_id: 'profile-1',
        username: 'wen-cat',
        display_name: 'Wen Cat',
        bio: null,
        linked_addresses: [LINKED_ADDRESS],
        trading_privacy: 'private',
      },
    );

    expect(created).toEqual(
      expect.objectContaining({
        profile_id: 'profile-1',
        username: 'wen-cat',
        display_name: 'Wen Cat',
        trading_privacy: 'private',
        linked_addresses: [LINKED_ADDRESS],
      }),
    );

    const availability = await request.controllerMessenger.call(
      'ProfileService:checkUsernameAvailability',
      'wen-cat',
    );
    expect(availability.available).toBe(true);

    const fetched = await request.controllerMessenger.call(
      'ProfileService:getProfile',
      'profile-1',
    );
    expect(fetched.username).toBe('wen-cat');

    const updated = await request.controllerMessenger.call(
      'ProfileService:updateProfile',
      'profile-1',
      { display_name: 'Wen Cat 2' },
    );
    expect(updated.display_name).toBe('Wen Cat 2');

    await request.controllerMessenger.call(
      'ProfileService:disconnectX',
      'profile-1',
    );
    const afterDisconnect = await request.controllerMessenger.call(
      'ProfileService:getProfile',
      'profile-1',
    );
    expect(afterDisconnect.connected_to_x).toBe(false);
  });

  it('rejects getProfile when no profile has been created', async () => {
    const request = getInitRequestMock();
    profileServiceInit(request);

    await expect(
      request.controllerMessenger.call('ProfileService:getProfile', 'missing'),
    ).rejects.toThrow('404');
  });

  it('instantiates ProfileService against PROFILE_API_URL when the profile API is enabled', async () => {
    jest.replaceProperty(AppConstants, 'PROFILE_API_ENABLED', true);
    jest.replaceProperty(
      AppConstants,
      'PROFILE_API_URL',
      'https://profile.test/api',
    );
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

    expect(controller).toBeInstanceOf(ProfileService);
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

  it('instantiates ProfileService when the mock is turned off', () => {
    const request = getInitRequestMock();
    const controller = createProfileServiceClient(
      request.controllerMessenger,
      false,
    );

    expect(controller).toBeInstanceOf(ProfileService);
  });
});
