import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getPhishingDataServiceMessenger } from '../messengers/phishing-data-service-messenger';
import { MessengerClientInitRequest } from '../types';
import { phishingDataServiceInit } from './phishing-data-service-init';
import {
  PhishingDataService,
  PhishingDataServiceMessenger,
} from '@metamask/phishing-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/phishing-controller');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<PhishingDataServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getPhishingDataServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('PhishingDataServiceInit', () => {
  it('initializes the service', () => {
    const { controller } = phishingDataServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(PhishingDataService);
  });

  it('passes the proper arguments to the service', () => {
    phishingDataServiceInit(getInitRequestMock());

    const serviceMock = jest.mocked(PhishingDataService);
    expect(serviceMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
    });
  });

  it('rehydrates the persisted query cache', () => {
    const { controller } = phishingDataServiceInit(getInitRequestMock());

    expect(jest.mocked(controller).init).toHaveBeenCalledTimes(1);
  });
});
