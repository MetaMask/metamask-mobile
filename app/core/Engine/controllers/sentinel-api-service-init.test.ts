import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getSentinelApiServiceMessenger } from '../messengers/sentinel-api-service-messenger';
import type { MessengerClientInitRequest } from '../types';
import { sentinelApiServiceInit } from './sentinel-api-service-init';
import {
  SentinelApiService,
  type SentinelApiServiceMessenger,
} from '@metamask/sentinel-api-service';
import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/sentinel-api-service');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<SentinelApiServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getSentinelApiServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };
}

describe('sentinelApiServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes the service', () => {
    const { controller } = sentinelApiServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(SentinelApiService);
  });

  it('passes fetch, messenger, and clientId to the service', () => {
    sentinelApiServiceInit(getInitRequestMock());

    const ServiceMock = jest.mocked(SentinelApiService);
    expect(ServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: expect.any(Object),
        fetch: expect.any(Function),
        clientId: 'mobile',
      }),
    );
  });
});
