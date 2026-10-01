import {
  ProfileController,
  ProfileControllerMessenger,
} from '@metamask/profile-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { MessengerClientInitRequest } from '../types';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { profileControllerInit } from './profile-controller-init';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getProfileControllerMessenger } from '../messengers/profile-controller-messenger';

jest.mock('@metamask/profile-controller');

function getInitRequestMock(
  persistedState: Record<string, unknown> = {},
): jest.Mocked<MessengerClientInitRequest<ProfileControllerMessenger>> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getProfileControllerMessenger(baseMessenger),
    initMessenger: undefined,
    persistedState,
  };
}

describe('profileControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes the controller', () => {
    const { controller } = profileControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(ProfileController);
  });

  it('passes the correct arguments to the controller', () => {
    profileControllerInit(getInitRequestMock());

    expect(jest.mocked(ProfileController)).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
    });
  });

  it('passes persisted state to the controller', () => {
    const persistedProfileState = {
      profile: {
        profileId: 'test-id',
        username: 'testuser',
        displayName: 'Test User',
        bio: '',
        linkedAddresses: [],
        avatarUrl: '',
        tradingPrivacy: 'public',
        connectedToX: false,
        createdAt: '',
        updatedAt: '',
      },
    };

    profileControllerInit(
      getInitRequestMock({ ProfileController: persistedProfileState }),
    );

    expect(jest.mocked(ProfileController)).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: persistedProfileState,
    });
  });
});
