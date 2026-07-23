import { AppState } from 'react-native';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import {
  Env,
  MoneyAccountApiDataService,
  MoneyAccountApiDataServiceMessenger,
  MoneyAccountApiDataServiceTraceCallback,
  MoneyAccountApiDataServiceTraceRequest,
} from '@metamask/money-account-api-data-service';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getMoneyAccountApiDataServiceMessenger } from '../messengers/money-account-api-data-service-messenger';
import { MessengerClientInitRequest } from '../types';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { moneyAccountApiDataServiceInit } from './money-account-api-data-service-init';
import { trace, TraceOperation } from '../../../util/trace';

jest.mock('@metamask/money-account-api-data-service', () => ({
  ...jest.requireActual('@metamask/money-account-api-data-service'),
  MoneyAccountApiDataService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../../util/trace', () => ({
  ...jest.requireActual('../../../util/trace'),
  trace: jest.fn(),
}));

interface MoneyAccountApiDataServiceOptions {
  messenger: MoneyAccountApiDataServiceMessenger;
  env: Env;
  trace?: MoneyAccountApiDataServiceTraceCallback;
}

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

const getServiceConstructorOptions = (): MoneyAccountApiDataServiceOptions => {
  const serviceMock = jest.mocked(MoneyAccountApiDataService);
  return serviceMock.mock.calls[0][0] as MoneyAccountApiDataServiceOptions;
};

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

  it('passes a trace callback to the service', () => {
    moneyAccountApiDataServiceInit(getInitRequestMock());

    expect(getServiceConstructorOptions().trace).toStrictEqual(
      expect.any(Function),
    );
  });
});

describe('trace tagging', () => {
  const createTraceRequest = (
    overrides: Partial<MoneyAccountApiDataServiceTraceRequest> = {},
  ): MoneyAccountApiDataServiceTraceRequest => ({
    id: 'test-trace-id',
    name: 'MoneyAccountApiDataService:fetchPositions',
    startTime: 1000,
    tags: { source: 'unit-test' },
    data: {},
    ...overrides,
  });

  const getTraceCallback = (): MoneyAccountApiDataServiceTraceCallback => {
    const traceCallback = getServiceConstructorOptions().trace;
    if (!traceCallback) {
      throw new Error('MoneyAccountApiDataService trace callback was not set');
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

  it('tags requests with MoneyAccountDataFetch operation and current app state', async () => {
    setAppStateCurrentState('background');
    moneyAccountApiDataServiceInit(getInitRequestMock());
    const traceCallback = getTraceCallback();

    await traceCallback(createTraceRequest());

    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-trace-id',
        name: 'MoneyAccountApiDataService:fetchPositions',
        startTime: 1000,
        op: TraceOperation.MoneyAccountDataFetch,
        tags: { source: 'unit-test' },
        data: expect.objectContaining({ app_state: 'background' }),
      }),
      expect.any(Function),
    );
  });

  it('tags trace requests with unknown app state when currentState is unset', async () => {
    setAppStateCurrentState(undefined);
    moneyAccountApiDataServiceInit(getInitRequestMock());
    const traceCallback = getTraceCallback();

    await traceCallback(createTraceRequest());

    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ app_state: 'unknown' }),
      }),
      expect.any(Function),
    );
  });

  it('preserves data already provided by the caller', async () => {
    setAppStateCurrentState('active');
    moneyAccountApiDataServiceInit(getInitRequestMock());
    const traceCallback = getTraceCallback();

    await traceCallback(
      createTraceRequest({ data: { success: true, errorName: '' } }),
    );

    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: true,
          errorName: '',
          app_state: 'active',
        }),
      }),
      expect.any(Function),
    );
  });

  it('forwards the callback function to trace', async () => {
    setAppStateCurrentState('active');
    moneyAccountApiDataServiceInit(getInitRequestMock());
    const traceCallback = getTraceCallback();
    const callback = jest.fn();

    await traceCallback(createTraceRequest(), callback);

    expect(trace).toHaveBeenCalledWith(expect.anything(), callback);
  });
});
