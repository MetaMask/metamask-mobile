import {
  MarketingConsentSyncService,
  type MarketingConsentSyncServiceMessenger,
} from '@metamask/marketing-consent-sync-service';
import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getMarketingConsentSyncServiceMessenger } from '../messengers/marketing-consent-sync-service-messenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import type { MessengerClientInitRequest } from '../types';
import { marketingConsentSyncServiceInit } from './marketing-consent-sync-service-init';

jest.mock('@metamask/marketing-consent-sync-service');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<MarketingConsentSyncServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getMarketingConsentSyncServiceMessenger(
      baseMessenger as never,
    ),
  };
}

describe('marketingConsentSyncServiceInit', () => {
  it('creates the service for the mobile client without persisted state', () => {
    const request = getInitRequestMock();

    const { controller } = marketingConsentSyncServiceInit(request);

    expect(controller).toBeInstanceOf(MarketingConsentSyncService);
    expect(jest.mocked(MarketingConsentSyncService)).toHaveBeenCalledWith({
      messenger: request.controllerMessenger,
      clientType: 'mobile',
    });
  });
});
