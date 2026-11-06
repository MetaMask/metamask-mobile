import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';
import {
  ProfileService,
  type ProfileApiResponse,
  type ProfileServiceMessenger,
} from '@metamask/profile-controller';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getProfileServiceMessenger } from '../messengers/profile-service-messenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import type { MessengerClientInitRequest } from '../types';
import { profileServiceInit } from './profile-service-init';

/**
 * Local stand-in for the `MOCK_PROFILE_API_RESPONSE` fixture that
 * `@metamask/profile-controller` removed in 2.0.0. Typed against the exported
 * `ProfileApiResponse` so it fails to compile if the API shape changes.
 */
const mockProfileApiResponse: ProfileApiResponse = {
  profile_id: 'p-1',
  username: 'monte',
  display_name: 'Monte',
  bio: null,
  linked_addresses: [
    'eip155:1:0x0000000000000000000000000000000000000001',
    'eip155:1:0x0000000000000000000000000000000000000002',
  ],
  avatar_url: 'foxicon://zombie/background4',
  trading_privacy: 'public',
  connected_to_x: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

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

  it('instantiates a real ProfileService', () => {
    const request = getInitRequestMock();
    const { controller } = profileServiceInit(request);
    expect(controller).toBeInstanceOf(ProfileService);
    controller.destroy();
  });

  it('refetches the profile after an update instead of serving the cached one', async () => {
    const staleProfile = {
      ...mockProfileApiResponse,
      profile_id: 'p-1',
      avatar_url: 'https://avatar.test/old.png',
    };
    const updatedProfile = {
      ...staleProfile,
      avatar_url: 'https://avatar.test/new.png',
    };
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(staleProfile)))
      .mockResolvedValueOnce(new Response(JSON.stringify(updatedProfile)))
      .mockResolvedValueOnce(new Response(JSON.stringify(updatedProfile)));
    const baseMessenger = createBaseMessenger();
    baseMessenger.registerActionHandler(
      'AuthenticationController:getBearerToken',
      async () => 'token',
    );
    const request = getInitRequestMock(baseMessenger);
    const { controller } = profileServiceInit(request);
    await request.controllerMessenger.call('ProfileService:getProfile', 'p-1');

    await request.controllerMessenger.call(
      'ProfileService:updateProfile',
      'p-1',
      { avatar_url: updatedProfile.avatar_url },
    );
    const refetched = await request.controllerMessenger.call(
      'ProfileService:getProfile',
      'p-1',
    );

    expect(refetched.avatar_url).toBe(updatedProfile.avatar_url);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    controller.destroy();
  });

  it('surfaces the API error message so the UI can name the reason', async () => {
    const apiMessage =
      'Linked addresses can only be updated once every 30 days';
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          message: apiMessage,
          error: 'Forbidden',
          statusCode: 403,
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const baseMessenger = createBaseMessenger();
    baseMessenger.registerActionHandler(
      'AuthenticationController:getBearerToken',
      async () => 'token',
    );
    const request = getInitRequestMock(baseMessenger);
    const { controller } = profileServiceInit(request);

    await expect(
      request.controllerMessenger.call('ProfileService:updateProfile', 'p-1', {
        linked_addresses: [mockProfileApiResponse.linked_addresses[0]],
      }),
    ).rejects.toThrow(
      `ProfileService: failed to update profile: 403: ${apiMessage}`,
    );

    controller.destroy();
  });
});
