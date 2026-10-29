import {
  ProfileController,
  type ProfileControllerMessenger,
} from '@metamask/profile-controller';
import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getProfileControllerMessenger } from '../messengers/profile-controller-messenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import type { MessengerClientInitRequest } from '../types';
import { profileControllerInit } from './profile-controller-init';

jest.mock('@metamask/profile-controller');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<ProfileControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getProfileControllerMessenger(baseMessenger),
  };
}

describe('profileControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('instantiates the ProfileController', () => {
    const { controller } = profileControllerInit(getInitRequestMock());

    expect(controller).toBeInstanceOf(ProfileController);
  });

  it('passes persisted state to the controller', () => {
    const mockState = {
      profile: {
        profileId: 'profile-123',
        username: 'alice',
        displayName: 'Alice',
        bio: '',
        linkedAddresses: [],
        avatarUrl: '',
        tradingPrivacy: 'public' as const,
        connectedToX: false,
        createdAt: '',
        updatedAt: '',
      },
    };
    const request = getInitRequestMock();
    request.persistedState = { ProfileController: mockState };

    profileControllerInit(request);

    expect(jest.mocked(ProfileController)).toHaveBeenCalledWith(
      expect.objectContaining({
        state: mockState,
      }),
    );
  });
});
