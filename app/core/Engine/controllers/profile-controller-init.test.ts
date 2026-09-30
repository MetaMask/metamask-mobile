import {
  ProfileController,
  getDefaultProfileControllerState,
  type ProfileControllerMessenger,
} from '@metamask/profile-controller';
import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { getProfileControllerMessenger } from '../messengers/profile-controller-messenger';
import { profileControllerInit } from './profile-controller-init';
import type { MessengerClientInitRequest } from '../types';

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
  it('instantiates the ProfileController', () => {
    const { controller } = profileControllerInit(getInitRequestMock());

    expect(controller).toBeInstanceOf(ProfileController);
  });

  it('hydrates persisted profile state', () => {
    const persistedProfile = {
      ...getDefaultProfileControllerState().profile,
      profileId: 'session-profile',
      username: 'wen-cat',
    };
    const request = getInitRequestMock();
    request.persistedState = {
      ProfileController: { profile: persistedProfile },
    };

    const { controller } = profileControllerInit(request);

    expect(controller.state.profile).toEqual(persistedProfile);
  });
});
