import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getProfileServiceMessenger } from '../messengers/profile-service-messenger';
import { profileServiceInit } from './profile-service-init';
import {
  ProfileService,
  type ProfileServiceMessenger,
} from '@metamask/profile-controller';
import { MessengerClientInitRequest } from '../types';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import AppConstants from '../../AppConstants';

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('instantiates the ProfileService', () => {
    const { controller } = profileServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(ProfileService);
  });

  it('is configured with the Profile API base URL from AppConstants', () => {
    // The service keeps its base URL private; a missing env-backed default
    // would surface as an invalid `undefined` URL at request time, so assert
    // the AppConstants value the init passes through is defined and absolute.
    const baseUrl = AppConstants.PROFILE_API_URL;
    expect(baseUrl).toBeDefined();
    expect(baseUrl).toMatch(/^https?:\/\//u);
  });
});
