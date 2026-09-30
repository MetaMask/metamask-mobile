import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getProfileServiceMessenger } from '../messengers/profile-service-messenger';
import { MOCK_X_AUTH_URL, MockProfileService } from './mock-profile-service';

const createParams = {
  profile_id: 'session-profile',
  username: 'wen-cat',
  display_name: 'Wen Cat',
  bio: null,
  linked_addresses: ['eip155:0:0x0000000000000000000000000000000000000001'],
  trading_privacy: 'private' as const,
};

describe('MockProfileService', () => {
  const setup = () => {
    const rootMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const messenger = getProfileServiceMessenger(rootMessenger);
    const service = new MockProfileService({ messenger });
    return { rootMessenger, service };
  };

  it('answers username checks in the availability schema', async () => {
    const { service } = setup();

    await expect(service.checkUsernameAvailability('Wen-Cat')).resolves.toEqual(
      {
        username: 'Wen-Cat',
        available: true,
        valid: true,
        normalized: 'wen-cat',
        errors: [],
      },
    );
  });

  it('creates, reads, updates, and deletes a profile in the API schema', async () => {
    const { rootMessenger, service } = setup();

    const created = await rootMessenger.call(
      'ProfileService:createProfile',
      createParams,
    );

    expect(created).toEqual(
      expect.objectContaining({
        profile_id: 'session-profile',
        username: 'wen-cat',
        display_name: 'Wen Cat',
        bio: null,
        trading_privacy: 'private',
        connected_to_x: false,
      }),
    );
    await expect(service.getProfile('session-profile')).resolves.toEqual(
      expect.objectContaining({ username: 'wen-cat' }),
    );

    await expect(
      service.updateProfile('session-profile', {
        trading_privacy: 'public',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        username: 'wen-cat',
        trading_privacy: 'public',
      }),
    );

    await service.deleteProfile('session-profile');

    await expect(service.getProfile('session-profile')).resolves.toEqual(
      expect.objectContaining({
        profile_id: 'session-profile',
        username: 'giga-whale',
        display_name: 'Giga Whale',
      }),
    );
  });

  it('links X through the same auth URL and connect body', async () => {
    const { service } = setup();

    await expect(service.getXAuthUrl()).resolves.toEqual({
      url: MOCK_X_AUTH_URL,
      state: 'mock-x-state',
    });

    const connected = await service.connectX({
      code: 'mock-code',
      state: 'mock-x-state',
    });

    expect(connected).toEqual(
      expect.objectContaining({
        x_user_id: 'mock-x-user',
        username: 'giga-whale',
      }),
    );
    await expect(service.getXAccount()).resolves.toEqual(connected);

    const created = await service.createProfile(createParams);
    expect(created.x_profile).toEqual(connected);
    expect(created.connected_to_x).toBe(true);
  });
});
