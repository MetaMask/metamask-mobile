import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import {
  Env,
  MoneyAccountApiDataService,
  MoneyAccountApiDataServiceMessenger,
} from '@metamask/money-account-api-data-service';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getMoneyAccountApiDataServiceMessenger } from '../messengers/money-account-api-data-service-messenger';
import { MessengerClientInitRequest } from '../types';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { moneyAccountApiDataServiceInit } from './money-account-api-data-service-init';

jest.mock('@metamask/money-account-api-data-service', () => ({
  ...jest.requireActual('@metamask/money-account-api-data-service'),
  MoneyAccountApiDataService: jest.fn().mockImplementation(() => ({})),
}));

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<MoneyAccountApiDataServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getMoneyAccountApiDataServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };
}

describe('moneyAccountApiDataServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a MoneyAccountApiDataService instance', () => {
    const { controller } = moneyAccountApiDataServiceInit(getInitRequestMock());

    expect(controller).toBeDefined();
  });

  it('passes messenger and Env.PRD to the service', () => {
    moneyAccountApiDataServiceInit(getInitRequestMock());

    const serviceMock = jest.mocked(MoneyAccountApiDataService);
    expect(serviceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: expect.any(Object),
        env: Env.PRD,
      }),
    );
  });
});
