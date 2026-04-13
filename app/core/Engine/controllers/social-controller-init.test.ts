import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getSocialControllerMessenger } from '../messengers/social-controller-messenger';
import { socialControllerInit } from './social-controller-init';
import {
  SocialController,
  type SocialControllerMessenger,
} from '@metamask/social-controllers';
import { MessengerClientInitRequest } from '../types';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/social-controllers');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<SocialControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getSocialControllerMessenger(baseMessenger),
  };
}

describe('socialControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('instantiates the SocialController', () => {
    const { controller } = socialControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(SocialController);
  });

  it('passes persisted state to the controller', () => {
    const mockState = { leaderboardEntries: [], followedAddresses: [] };
    const request = getInitRequestMock();
    request.persistedState = { SocialController: mockState };

    socialControllerInit(request);

    expect(jest.mocked(SocialController)).toHaveBeenCalledWith(
      expect.objectContaining({
        state: mockState,
      }),
    );
  });
});
