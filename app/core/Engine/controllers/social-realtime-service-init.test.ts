import { SocialRealtimeService } from '@metamask/social-controllers';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

import { ExtendedMessenger } from '../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { socialRealtimeServiceInit } from './social-realtime-service-init';

jest.mock('@metamask/social-controllers', () => ({
  SocialRealtimeService: jest.fn(),
}));

describe('socialRealtimeServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSocialRealtimeService = jest.mocked(SocialRealtimeService);

  const createInitRequest = () => {
    const controllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });

    return buildMessengerClientInitRequestMock(controllerMessenger);
  };

  it('initializes the service for the all feed without a feature flag gate', () => {
    socialRealtimeServiceInit(createInitRequest());

    expect(mockSocialRealtimeService).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: ['all'],
      }),
    );
    expect(mockSocialRealtimeService.mock.calls[0][0]).not.toHaveProperty(
      'isEnabled',
    );
  });
});
