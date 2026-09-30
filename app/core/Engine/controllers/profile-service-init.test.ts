import type { ProfileServiceMessenger } from '@metamask/profile-controller';
import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { getProfileServiceMessenger } from '../messengers/profile-service-messenger';
import { MockProfileService } from './mock-profile-service';
import { profileServiceInit } from './profile-service-init';
import type { MessengerClientInitRequest } from '../types';

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
  it('installs the mock profile service until the API is live', () => {
    const { controller } = profileServiceInit(getInitRequestMock());

    expect(controller).toBeInstanceOf(MockProfileService);
  });
});
