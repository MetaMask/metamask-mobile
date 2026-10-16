import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';
import {
  ProfileService,
  type ProfileServiceMessenger,
} from '@metamask/profile-controller';
import type { CaipAccountId } from '@metamask/utils';
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

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<ProfileServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getProfileServiceMessenger(baseMessenger),
  };
}

describe('profileServiceInit', () => {
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
