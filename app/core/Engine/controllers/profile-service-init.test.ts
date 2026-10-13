import {
  ProfileService,
  type ProfileServiceMessenger,
} from '@metamask/profile-controller';
import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getProfileServiceMessenger } from '../messengers/profile-service-messenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import type { MessengerClientInitRequest } from '../types';
import { profileServiceInit } from './profile-service-init';

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
  it('instantiates the ProfileService', () => {
    const { controller } = profileServiceInit(getInitRequestMock());

    expect(controller).toBeInstanceOf(ProfileService);
  });
});
