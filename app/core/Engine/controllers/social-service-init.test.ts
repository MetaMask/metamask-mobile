import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getSocialServiceMessenger } from '../messengers/social-service-messenger';
import { socialServiceInit } from './social-service-init';
import {
  SocialService,
  type SocialServiceMessenger,
} from '@metamask/social-controllers';
import { ControllerInitRequest } from '../types';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<SocialServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildControllerInitRequestMock(baseMessenger),
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
});
