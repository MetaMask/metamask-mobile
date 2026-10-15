import {
  MarketingConsentController,
  type MarketingConsentControllerMessenger,
} from '@metamask/marketing-consent-controller';
import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getMarketingConsentControllerMessenger } from '../messengers/marketing-consent-controller-messenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import type { MessengerClientInitRequest } from '../types';
import { marketingConsentControllerInit } from './marketing-consent-controller-init';

jest.mock('@metamask/marketing-consent-controller');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<MarketingConsentControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getMarketingConsentControllerMessenger(
      baseMessenger as never,
    ),
  };
}

describe('marketingConsentControllerInit', () => {
  it('creates the controller for the mobile client with persisted state', () => {
    const request = getInitRequestMock();
    request.persistedState = {
      MarketingConsentController: { pendingMarketingConsent: false },
    };

    const { controller } = marketingConsentControllerInit(request);

    expect(controller).toBeInstanceOf(MarketingConsentController);
    expect(jest.mocked(MarketingConsentController)).toHaveBeenCalledWith({
      messenger: request.controllerMessenger,
      state: { pendingMarketingConsent: false },
      clientType: 'mobile',
    });
  });
});
