import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getMoneyAccountApiDataServiceMessenger } from '../messengers/money-account-api-data-service-messenger';
import { MessengerClientInitRequest } from '../types';
import { moneyAccountApiDataServiceInit } from './money-account-api-data-service-init';
import {
  MoneyAccountApiDataService,
  MoneyAccountApiDataServiceMessenger,
} from '@metamask/money-account-api-data-service';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

const mockTrace = jest.fn();

jest.mock('../../../util/trace', () => ({
  trace: (...args: unknown[]) => mockTrace(...args),
}));

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

  it('passes messenger to the service', () => {
    moneyAccountApiDataServiceInit(getInitRequestMock());

    const serviceMock = jest.mocked(MoneyAccountApiDataService);
    expect(serviceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: expect.any(Object),
      }),
    );
  });

  it('passes a trace callback to the service', () => {
    moneyAccountApiDataServiceInit(getInitRequestMock());

    const serviceMock = jest.mocked(MoneyAccountApiDataService);
    expect(serviceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        trace: expect.any(Function),
      }),
    );
  });

  it('trace callback forwards request to Sentry trace utility', async () => {
    moneyAccountApiDataServiceInit(getInitRequestMock());

    const serviceMock = jest.mocked(MoneyAccountApiDataService);
    const constructorArgs = serviceMock.mock.calls[0][0];
    const traceCallback = constructorArgs.trace!;

    const mockFn = jest.fn(() => 'result');
    mockTrace.mockReturnValue('result');

    await traceCallback(
      {
        name: 'Money Account API Fetch Positions' as const,
        startTime: 1000,
        data: { operation: 'fetchPositions', success: true },
      },
      mockFn,
    );

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Money Account API Fetch Positions',
        startTime: 1000,
        data: { operation: 'fetchPositions', success: true },
      }),
      mockFn,
    );
  });
});
