import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getSocialServiceMessenger } from '../messengers/social-service-messenger';
import {
  SOCIAL_SERVICE_POLICY_OPTIONS,
  socialServiceInit,
} from './social-service-init';
import {
  SocialService,
  type SocialServiceMessenger,
} from '@metamask/social-controllers';
import { MessengerClientInitRequest } from '../types';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/social-controllers');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<SocialServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getSocialServiceMessenger(baseMessenger),
  };
}

describe('socialServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('instantiates the SocialService', () => {
    const { controller } = socialServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(SocialService);
  });

  it('reopens the shared circuit after 30 seconds instead of 30 minutes', () => {
    socialServiceInit(getInitRequestMock());

    expect(jest.mocked(SocialService)).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      baseUrl: expect.any(String),
      policyOptions: SOCIAL_SERVICE_POLICY_OPTIONS,
    });
    expect(SOCIAL_SERVICE_POLICY_OPTIONS).toEqual({
      maxRetries: 1,
      circuitBreakDuration: 30_000,
    });
  });
});
