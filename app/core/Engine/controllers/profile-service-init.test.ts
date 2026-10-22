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
import { profileServiceInit } from './profile-service-init';

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
  it('instantiates a real ProfileService', () => {
    const request = getInitRequestMock();
    const { controller } = profileServiceInit(request);
    expect(controller).toBeInstanceOf(ProfileService);
    controller.destroy();
  });
});
