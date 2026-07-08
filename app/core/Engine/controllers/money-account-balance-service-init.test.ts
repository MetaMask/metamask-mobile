import { AppState } from 'react-native';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getMoneyAccountBalanceServiceMessenger } from '../messengers/money-account-balance-service-messenger';
import { MessengerClientInitRequest } from '../types';
import { moneyAccountBalanceServiceInit } from './money-account-balance-service-init';
import {
  MoneyAccountBalanceService,
  MoneyAccountBalanceServiceOptions,
  MoneyAccountBalanceServiceMessenger,
  MoneyAccountBalanceServiceTraceCallback,
  MoneyAccountBalanceServiceTraceRequest,
} from '@metamask/money-account-balance-service';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { trace, TraceOperation } from '../../../util/trace';

jest.mock('@metamask/money-account-balance-service', () => ({
  ...jest.requireActual('@metamask/money-account-balance-service'),
  MoneyAccountBalanceService: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
  })),
}));

jest.mock('../../../util/trace', () => ({
  ...jest.requireActual('../../../util/trace'),
  trace: jest.fn(),
}));

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<MoneyAccountBalanceServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getMoneyAccountBalanceServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };
}

const getServiceConstructorOptions = (): MoneyAccountBalanceServiceOptions => {
  const serviceMock = jest.mocked(MoneyAccountBalanceService);
  return serviceMock.mock.calls[0][0];
};

describe('moneyAccountBalanceServiceInit', () => {
  it('returns a MoneyAccountBalanceService instance', () => {
    const initRequest = getInitRequestMock();

    const { controller } = moneyAccountBalanceServiceInit(initRequest);

    expect(controller).toBe(
      jest.mocked(MoneyAccountBalanceService).mock.results[0].value,
    );
  });

  it('passes messenger to the service', () => {
    const initRequest = getInitRequestMock();

    moneyAccountBalanceServiceInit(initRequest);

    expect(getServiceConstructorOptions().messenger).toStrictEqual(
      initRequest.controllerMessenger,
    );
  });

  it('calls init on the service', () => {
    const initRequest = getInitRequestMock();

    moneyAccountBalanceServiceInit(initRequest);

    const serviceMock = jest.mocked(MoneyAccountBalanceService);
    expect(serviceMock.mock.results[0].value.init).toHaveBeenCalled();
  });
});

describe('trace tagging', () => {
  const createTraceRequest = (
    overrides: Partial<MoneyAccountBalanceServiceTraceRequest> = {},
  ): MoneyAccountBalanceServiceTraceRequest => ({
    id: 'test-trace-id',
    name: 'Get Money Account Balance RPC',
    startTime: 1000,
    tags: { source: 'unit-test' },
    data: {},
    ...overrides,
  });

  const getTraceCallback = (): MoneyAccountBalanceServiceTraceCallback => {
    const traceCallback = getServiceConstructorOptions().trace;
    if (!traceCallback) {
      throw new Error('MoneyAccountBalanceService trace callback was not set');
    }
    return traceCallback;
  };

  const setAppStateCurrentState = (currentState: string | undefined) => {
    Object.defineProperty(AppState, 'currentState', {
      value: currentState,
      configurable: true,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    setAppStateCurrentState('active');
  });

  it('passes trace callback that tags requests with the current app state', async () => {
    setAppStateCurrentState('background');
    moneyAccountBalanceServiceInit(getInitRequestMock());
    const traceCallback = getTraceCallback();

    await traceCallback(createTraceRequest());

    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-trace-id',
        name: 'Get Money Account Balance RPC',
        startTime: 1000,
        op: TraceOperation.MoneyAccountDataFetch,
        tags: { source: 'unit-test' },
        data: expect.objectContaining({ app_state: 'background' }),
      }),
    );
  });

  it('tags trace requests with unknown app state when currentState is unset', async () => {
    setAppStateCurrentState(undefined);
    moneyAccountBalanceServiceInit(getInitRequestMock());
    const traceCallback = getTraceCallback();

    await traceCallback(createTraceRequest());

    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ app_state: 'unknown' }),
      }),
    );
  });

  it('preserves data already provided by the caller', async () => {
    setAppStateCurrentState('active');
    moneyAccountBalanceServiceInit(getInitRequestMock());
    const traceCallback = getTraceCallback();

    await traceCallback(createTraceRequest({ data: { address: '0x123' } }));

    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Get Money Account Balance RPC',
        data: expect.objectContaining({
          address: '0x123',
          app_state: 'active',
        }),
      }),
    );
  });

  it('forwards the callback function to trace', async () => {
    setAppStateCurrentState('active');
    moneyAccountBalanceServiceInit(getInitRequestMock());
    const traceCallback = getTraceCallback();
    const callback = jest.fn();

    await traceCallback(createTraceRequest(), callback);

    expect(trace).toHaveBeenCalledWith(expect.anything(), callback);
  });
});
